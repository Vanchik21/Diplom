using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Physis.Api.Data;
using Physis.Api.DTOs;
using Physis.Api.Models;

namespace Physis.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/gdpr")]
public class GdprController(
    UserManager<ApplicationUser> userManager,
    AppDbContext db,
    IWebHostEnvironment env) : ControllerBase
{
    [HttpGet("export")]
    public async Task<ActionResult<GdprExportDto>> Export()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();

        var scenarios = await db.SavedScenarios
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.CreatedAt)
            .Select(s => new GdprScenarioDto(
                s.Id, s.ModuleId, s.Name,
                s.ParamsJson, s.StateSnapshotJson, s.PredictionsJson,
                s.CreatedAt))
            .ToListAsync();

        var profile = new GdprProfileDto(
            user.Id, user.Email!, user.UserName!,
            user.FirstName, user.LastName, user.University,
            user.Faculty, user.StudyYear, user.Bio,
            user.CreatedAt, user.UpdatedAt);

        return Ok(new GdprExportDto(profile, scenarios));
    }

    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();

        if (!string.IsNullOrEmpty(user.AvatarUrl))
        {
            var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
            var fileName = Path.GetFileName(user.AvatarUrl);
            var filePath = Path.Combine(webRoot, "uploads", "avatars", fileName);
            if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
        }

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return StatusCode(500, result.Errors.Select(e => e.Description));

        return NoContent();
    }
}
