using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Physis.Api.DTOs;
using Physis.Api.Models;
using Physis.Api.Services;

namespace Physis.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/analytics")]
public class AnalyticsController(AnalyticsService analyticsService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("/api/modules/catalog")]
    public ActionResult<List<ModuleCatalogEntryDto>> GetCatalog()
    {
        var entries = ModuleCatalog.Entries
            .Select(e => new ModuleCatalogEntryDto(e.Id, e.NameUk, e.NameEn, e.Category))
            .ToList();
        return Ok(entries);
    }

    [Authorize(Roles = "Teacher")]
    [HttpGet("classrooms/{classroomId:guid}/overview")]
    public async Task<ActionResult<ClassroomOverviewDto>> GetOverview(Guid classroomId)
    {
        var result = await analyticsService.GetOverviewAsync(classroomId, RequireUserId());
        return result is null ? Forbid() : Ok(result);
    }

    [Authorize(Roles = "Teacher")]
    [HttpGet("classrooms/{classroomId:guid}/students/{studentId}")]
    public async Task<ActionResult<StudentTimelineDto>> GetStudentTimeline(
        Guid classroomId, string studentId)
    {
        var result = await analyticsService.GetStudentTimelineAsync(
            classroomId, studentId, RequireUserId());
        return result is null ? Forbid() : Ok(result);
    }

    [HttpGet("me")]
    public async Task<ActionResult<PersonalAnalyticsDto>> GetPersonal()
    {
        return Ok(await analyticsService.GetPersonalAsync(RequireUserId()));
    }

    private string RequireUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User ID not found in token.");
}
