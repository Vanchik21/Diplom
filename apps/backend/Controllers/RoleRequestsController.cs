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
[Authorize]
[Route("api")]
public class RoleRequestsController(
    AppDbContext db,
    UserManager<ApplicationUser> userManager) : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles = ["Student", "Teacher"];

    [HttpPost("users/me/role-request")]
    public async Task<IActionResult> Submit(SubmitRoleRequestDto dto)
    {
        if (!AllowedRoles.Contains(dto.RequestedRole))
            return BadRequest(new { error = "RequestedRole must be 'Student' or 'Teacher'." });

        var userId = UserId();
        if (userId is null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Contains("Admin"))
            return BadRequest(new { error = "Admins cannot request a role change." });

        if (currentRoles.Contains(dto.RequestedRole))
            return BadRequest(new { error = "You already have this role." });

        var existing = await db.RoleChangeRequests
            .Where(r => r.UserId == userId && r.Status == "Pending")
            .FirstOrDefaultAsync();

        if (existing is not null)
            return Conflict(new { error = "You already have a pending role change request." });

        var req = new RoleChangeRequest
        {
            UserId = userId,
            RequestedRole = dto.RequestedRole,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        };
        db.RoleChangeRequests.Add(req);
        await db.SaveChangesAsync();

        return Ok(ToDto(req, user));
    }

    [HttpGet("users/me/role-request")]
    public async Task<ActionResult<RoleRequestDto?>> GetMine()
    {
        var userId = UserId();
        if (userId is null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        var req = await db.RoleChangeRequests
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        return Ok(req is null ? null : ToDto(req, user));
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/role-requests")]
    public async Task<ActionResult<List<RoleRequestDto>>> GetAll([FromQuery] string? status = "Pending")
    {
        var query = db.RoleChangeRequests
            .Include(r => r.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        var list = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => ToDto(r, r.User))
            .ToListAsync();

        return Ok(list);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/role-requests/{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var req = await db.RoleChangeRequests.Include(r => r.User).FirstOrDefaultAsync(r => r.Id == id);
        if (req is null) return NotFound();
        if (req.Status != "Pending") return BadRequest(new { error = "Request is not pending." });

        var user = req.User;
        var currentRoles = await userManager.GetRolesAsync(user);
        var nonAdminRoles = currentRoles.Where(r => r != "Admin").ToList();
        if (nonAdminRoles.Count > 0)
            await userManager.RemoveFromRolesAsync(user, nonAdminRoles);
        await userManager.AddToRoleAsync(user, req.RequestedRole);

        req.Status = "Approved";
        req.ResolvedAt = DateTime.UtcNow;
        req.ResolvedByAdminId = UserId();
        await db.SaveChangesAsync();

        return NoContent();
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("admin/role-requests/{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var req = await db.RoleChangeRequests.FirstOrDefaultAsync(r => r.Id == id);
        if (req is null) return NotFound();
        if (req.Status != "Pending") return BadRequest(new { error = "Request is not pending." });

        req.Status = "Rejected";
        req.ResolvedAt = DateTime.UtcNow;
        req.ResolvedByAdminId = UserId();
        await db.SaveChangesAsync();

        return NoContent();
    }

    private string? UserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");

    private static RoleRequestDto ToDto(RoleChangeRequest r, ApplicationUser user) =>
        new(r.Id, r.UserId, user.UserName!, user.Email!, r.RequestedRole, r.Status, r.CreatedAt);
}
