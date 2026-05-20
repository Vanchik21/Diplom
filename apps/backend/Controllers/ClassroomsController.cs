using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Physis.Api.DTOs;
using Physis.Api.Services;

namespace Physis.Api.Controllers;

[ApiController]
[Route("api/classrooms")]
[Authorize]
public class ClassroomsController(ClassroomService classroomService) : ControllerBase
{
    [Authorize(Roles = "Teacher")]
    [HttpPost]
    public async Task<ActionResult<ClassroomSummaryDto>> Create(ClassroomCreateDto dto)
    {
        var userId = RequireUserId();
        var result = await classroomService.CreateAsync(userId, dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("mine")]
    public async Task<ActionResult<List<ClassroomSummaryDto>>> GetMine()
    {
        var userId = RequireUserId();
        return Ok(await classroomService.GetMineAsync(userId));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ClassroomDetailDto>> GetById(Guid id)
    {
        var userId = RequireUserId();
        var result = await classroomService.GetDetailAsync(id, userId);
        return result is null ? Forbid() : Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ClassroomSummaryDto>> Update(Guid id, ClassroomUpdateDto dto)
    {
        var userId = RequireUserId();
        var result = await classroomService.UpdateAsync(id, userId, dto);
        return result is null ? Forbid() : Ok(result);
    }

    [HttpPost("join")]
    public async Task<ActionResult<ClassroomSummaryDto>> Join(JoinClassroomDto dto)
    {
        var userId = RequireUserId();
        var result = await classroomService.JoinAsync(userId, dto.InviteCode);
        return result is null ? BadRequest(new { error = "Невірний код або клас не знайдено." }) : Ok(result);
    }

    [HttpDelete("{id:guid}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(Guid id, string userId)
    {
        var requesterId = RequireUserId();
        var removed = await classroomService.RemoveMemberAsync(id, requesterId, userId);
        return removed ? NoContent() : Forbid();
    }

    [HttpPost("{id:guid}/rotate-code")]
    public async Task<ActionResult<RotateCodeResponse>> RotateCode(Guid id)
    {
        var userId = RequireUserId();
        var newCode = await classroomService.RotateCodeAsync(id, userId);
        return newCode is null ? Forbid() : Ok(new RotateCodeResponse(newCode));
    }

    private string RequireUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User ID not found in token.");
}
