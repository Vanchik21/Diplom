using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Physis.Api.Data;
using Physis.Api.DTOs;
using Physis.Api.Models;

namespace Physis.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(
    UserManager<ApplicationUser> userManager,
    AppDbContext db) : ControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> GetStats()
    {
        var totalUsers   = await db.Users.CountAsync();
        var activeUsers  = await db.Users.CountAsync(u => u.IsActive);
        var adminUsers   = (await userManager.GetUsersInRoleAsync("Admin")).Count;
        var totalScenarios = await db.SavedScenarios.CountAsync();
        return Ok(new AdminStatsDto(totalUsers, activeUsers, adminUsers, totalScenarios));
    }

    [HttpGet("users")]
    public async Task<ActionResult<PagedResult<AdminUserDto>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = 20;

        var query = db.Users.IgnoreQueryFilters().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                u.Email!.ToLower().Contains(s) ||
                u.UserName!.ToLower().Contains(s) ||
                u.FirstName.ToLower().Contains(s) ||
                u.LastName.ToLower().Contains(s));
        }

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        var total = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var adminIds   = (await userManager.GetUsersInRoleAsync("Admin")).Select(u => u.Id).ToHashSet();
        var teacherIds = (await userManager.GetUsersInRoleAsync("Teacher")).Select(u => u.Id).ToHashSet();
        var studentIds = (await userManager.GetUsersInRoleAsync("Student")).Select(u => u.Id).ToHashSet();

        var items = users
            .Where(u =>
            {
                if (string.IsNullOrWhiteSpace(role)) return true;
                return role switch
                {
                    "Admin"   => adminIds.Contains(u.Id),
                    "Teacher" => teacherIds.Contains(u.Id),
                    "Student" => studentIds.Contains(u.Id),
                    _         => true,
                };
            })
            .Select(u => new AdminUserDto(
                u.Id,
                u.Email!,
                u.UserName!,
                u.FirstName,
                u.LastName,
                u.University,
                u.AvatarUrl,
                u.IsActive,
                u.IsDeleted,
                adminIds.Contains(u.Id),
                adminIds.Contains(u.Id)   ? "Admin"
                    : teacherIds.Contains(u.Id) ? "Teacher"
                    : studentIds.Contains(u.Id) ? "Student"
                    : "User",
                u.CreatedAt))
            .ToList();

        return Ok(new PagedResult<AdminUserDto>(items, total, page, pageSize));
    }

    [HttpPatch("users/{id}/deactivate")]
    public async Task<IActionResult> Deactivate(string id)
    {
        var callerId = CallerId();
        if (id == callerId) return BadRequest(new { error = "Cannot deactivate your own account." });

        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound();
        if (await userManager.IsInRoleAsync(user, "Admin"))
            return BadRequest(new { error = "Cannot deactivate another Admin." });

        user.IsActive = false;
        user.TokenVersion++;
        await userManager.UpdateAsync(user);

        await WriteLog(callerId!, "Deactivate", id, null);
        return NoContent();
    }

    [HttpPatch("users/{id}/activate")]
    public async Task<IActionResult> Activate(string id)
    {
        var user = await userManager.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        user.IsActive = true;
        await userManager.UpdateAsync(user);

        await WriteLog(CallerId()!, "Activate", id, null);
        return NoContent();
    }

    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var callerId = CallerId();
        if (id == callerId) return BadRequest(new { error = "Cannot delete your own account." });

        var user = await userManager.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();
        if (await userManager.IsInRoleAsync(user, "Admin"))
            return BadRequest(new { error = "Cannot delete an Admin account." });

        user.IsDeleted = true;
        user.IsActive  = false;
        user.TokenVersion++;
        await userManager.UpdateAsync(user);

        await WriteLog(callerId!, "Delete", id, null);
        return NoContent();
    }

    [HttpPut("users/{id}/set-admin")]
    public async Task<IActionResult> SetAdmin(string id, [FromBody] SetRoleRequest request)
    {
        var callerId = CallerId();
        if (id == callerId) return BadRequest(new { error = "Cannot modify your own admin role." });

        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        if (request.IsAdmin)
        {
            if (!await userManager.IsInRoleAsync(user, "Admin"))
                await userManager.AddToRoleAsync(user, "Admin");
        }
        else
        {
            if (await userManager.IsInRoleAsync(user, "Admin"))
                await userManager.RemoveFromRoleAsync(user, "Admin");
        }

        return NoContent();
    }

    [HttpGet("audit-log")]
    public async Task<ActionResult<PagedResult<AdminAuditLogDto>>> GetAuditLog(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 30,
        [FromQuery] string? action = null)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = 30;

        var query = db.AdminAuditLogs
            .Include(l => l.Admin)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(l => l.Action == action);

        var total = await query.CountAsync();
        var logs  = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var targetIds = logs.Select(l => l.TargetUserId).Distinct().ToList();
        var targets   = await userManager.Users
            .IgnoreQueryFilters()
            .Where(u => targetIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.UserName ?? u.Email ?? u.Id);

        var items = logs.Select(l => new AdminAuditLogDto(
            l.Id,
            l.AdminId,
            l.Admin.UserName ?? l.Admin.Email ?? l.AdminId,
            l.Action,
            l.TargetUserId,
            targets.GetValueOrDefault(l.TargetUserId, l.TargetUserId),
            l.Details,
            l.CreatedAt)).ToList();

        return Ok(new PagedResult<AdminAuditLogDto>(items, total, page, pageSize));
    }

    internal async Task WriteLog(string adminId, string action, string targetUserId, string? details)
    {
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            AdminId      = adminId,
            Action       = action,
            TargetUserId = targetUserId,
            Details      = details,
            CreatedAt    = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private string? CallerId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
}
