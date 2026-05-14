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
        var totalUsers = await db.Users.CountAsync();
        var activeUsers = await db.Users.CountAsync(u => u.IsActive);
        var adminUsers = (await userManager.GetUsersInRoleAsync("Admin")).Count;
        var totalScenarios = await db.SavedScenarios.CountAsync();
        return Ok(new AdminStatsDto(totalUsers, activeUsers, adminUsers, totalScenarios));
    }

    [HttpGet("users")]
    public async Task<ActionResult<PagedResult<AdminUserDto>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = 20;

        var query = db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                u.Email!.ToLower().Contains(s) ||
                u.UserName!.ToLower().Contains(s) ||
                u.FirstName.ToLower().Contains(s) ||
                u.LastName.ToLower().Contains(s));
        }

        var total = await query.CountAsync();
        var users = await query
            .OrderBy(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var adminIds = (await userManager.GetUsersInRoleAsync("Admin"))
            .Select(u => u.Id)
            .ToHashSet();

        var items = users.Select(u => new AdminUserDto(
            u.Id,
            u.Email!,
            u.UserName!,
            u.FirstName,
            u.LastName,
            u.University,
            u.AvatarUrl,
            u.IsActive,
            adminIds.Contains(u.Id),
            u.CreatedAt)).ToList();

        return Ok(new PagedResult<AdminUserDto>(items, total, page, pageSize));
    }

    [HttpPut("users/{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(string id)
    {
        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;
        if (id == callerId)
            return BadRequest("Cannot deactivate your own account.");

        var user = await userManager.FindByIdAsync(id);
        if (user is null) return NotFound();

        user.IsActive = !user.IsActive;
        await userManager.UpdateAsync(user);
        return NoContent();
    }

    [HttpPut("users/{id}/set-admin")]
    public async Task<IActionResult> SetAdmin(string id, [FromBody] SetRoleRequest request)
    {
        var callerId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                       ?? User.FindFirst("sub")?.Value;
        if (id == callerId)
            return BadRequest("Cannot modify your own admin role.");

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
}
