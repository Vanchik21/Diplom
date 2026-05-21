using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Physis.Api.DTOs;
using Physis.Api.Services;

namespace Physis.Api.Controllers;

[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController(AssignmentService assignmentService) : ControllerBase
{
    [Authorize(Roles = "Teacher")]
    [HttpPost]
    public async Task<ActionResult<AssignmentSummaryDto>> Create(AssignmentCreateDto dto)
    {
        var userId = RequireUserId();
        var result = await assignmentService.CreateAsync(userId, dto);
        return result is null ? Forbid() : CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpGet("classroom/{classroomId:guid}")]
    public async Task<ActionResult<List<AssignmentSummaryDto>>> GetForClassroom(Guid classroomId)
    {
        var userId = RequireUserId();
        return Ok(await assignmentService.GetForClassroomAsync(classroomId, userId));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AssignmentDetailDto>> GetById(Guid id)
    {
        var userId = RequireUserId();
        var result = await assignmentService.GetDetailAsync(id, userId);
        return result is null ? Forbid() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = RequireUserId();
        var deleted = await assignmentService.DeleteAsync(id, userId);
        return deleted ? NoContent() : Forbid();
    }

    [Authorize(Roles = "Student")]
    [HttpPost("{id:guid}/submit")]
    public async Task<ActionResult<SubmissionResultDto>> Submit(Guid id, SubmitAssignmentDto dto)
    {
        var userId = RequireUserId();
        var result = await assignmentService.SubmitAsync(id, userId, dto);
        return result is null
            ? BadRequest(new { error = "Could not submit. Already submitted or not a student." })
            : Ok(result);
    }

    [Authorize(Roles = "Teacher")]
    [HttpPatch("submissions/{submissionId:guid}/grade")]
    public async Task<ActionResult<SubmissionResultDto>> Grade(Guid submissionId, GradeSubmissionDto dto)
    {
        var userId = RequireUserId();
        var result = await assignmentService.GradeAsync(submissionId, userId, dto.TeacherScore, dto.Comment);
        return result is null ? Forbid() : Ok(result);
    }

    private string RequireUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User ID not found in token.");
}
