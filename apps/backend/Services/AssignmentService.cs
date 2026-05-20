using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Physis.Api.Data;
using Physis.Api.DTOs;
using Physis.Api.Models;

namespace Physis.Api.Services;

public class AssignmentService(AppDbContext db)
{
    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    public async Task<AssignmentSummaryDto?> CreateAsync(string userId, AssignmentCreateDto dto)
    {
        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == dto.ClassroomId && m.UserId == userId);

        if (membership is null || membership.Role != ClassroomRole.Teacher)
            return null;

        var assignment = new Assignment
        {
            ClassroomId     = dto.ClassroomId,
            ModuleId        = dto.ModuleId,
            Title           = dto.Title,
            Description     = dto.Description,
            ExpectedMetrics = JsonSerializer.Serialize(dto.ExpectedMetrics ?? new Dictionary<string, double>()),
            DueAt           = dto.DueAt,
            CreatedAt       = DateTime.UtcNow,
            CreatedById     = userId,
        };

        db.Assignments.Add(assignment);
        await db.SaveChangesAsync();

        return ToSummary(assignment, 0, null);
    }

    public async Task<List<AssignmentSummaryDto>> GetForClassroomAsync(
        Guid classroomId, string userId)
    {
        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == classroomId && m.UserId == userId);

        if (membership is null) return [];

        var assignments = await db.Assignments
            .Where(a => a.ClassroomId == classroomId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                Assignment      = a,
                SubmissionCount = a.Submissions.Count,
                MySubmission    = a.Submissions.FirstOrDefault(s => s.StudentId == userId),
            })
            .ToListAsync();

        return assignments
            .Select(x => ToSummary(x.Assignment, x.SubmissionCount,
                x.MySubmission is null ? null : ToResult(x.MySubmission, x.MySubmission.Student)))
            .ToList();
    }

    public async Task<AssignmentDetailDto?> GetDetailAsync(Guid assignmentId, string userId)
    {
        var assignment = await db.Assignments
            .Include(a => a.Submissions)
                .ThenInclude(s => s.Student)
            .FirstOrDefaultAsync(a => a.Id == assignmentId);

        if (assignment is null) return null;

        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == assignment.ClassroomId && m.UserId == userId);

        if (membership is null) return null;

        var isTeacher = membership.Role == ClassroomRole.Teacher;

        var expected = DeserializeMetrics(assignment.ExpectedMetrics);

        var mySubmission = assignment.Submissions
            .FirstOrDefault(s => s.StudentId == userId);

        var allSubmissions = isTeacher
            ? assignment.Submissions
                .OrderByDescending(s => s.SubmittedAt)
                .Select(s => ToResult(s, s.Student))
                .ToList()
            : [];

        return new AssignmentDetailDto(
            assignment.Id,
            assignment.ClassroomId,
            assignment.ModuleId,
            assignment.Title,
            assignment.Description,
            expected,
            assignment.DueAt,
            assignment.CreatedAt,
            isTeacher,
            mySubmission is null ? null : ToResult(mySubmission, mySubmission.Student),
            allSubmissions
        );
    }

    public async Task<bool> DeleteAsync(Guid assignmentId, string userId)
    {
        var assignment = await db.Assignments.FindAsync(assignmentId);
        if (assignment is null) return false;

        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == assignment.ClassroomId && m.UserId == userId);

        if (membership is null || membership.Role != ClassroomRole.Teacher) return false;

        db.Assignments.Remove(assignment);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<SubmissionResultDto?> SubmitAsync(
        Guid assignmentId, string userId, SubmitAssignmentDto dto)
    {
        var assignment = await db.Assignments
            .FirstOrDefaultAsync(a => a.Id == assignmentId);
        if (assignment is null) return null;

        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == assignment.ClassroomId && m.UserId == userId);

        if (membership is null || membership.Role != ClassroomRole.Student) return null;

        var alreadySubmitted = await db.Submissions
            .AnyAsync(s => s.AssignmentId == assignmentId && s.StudentId == userId);
        if (alreadySubmitted) return null;

        var expected = DeserializeMetrics(assignment.ExpectedMetrics);
        var (score, rows) = GradingService.Grade(expected, dto.ObservedMetrics);

        var submission = new Submission
        {
            AssignmentId    = assignmentId,
            StudentId       = userId,
            ObservedMetrics = JsonSerializer.Serialize(dto.ObservedMetrics),
            GradingRows     = JsonSerializer.Serialize(rows),
            Score           = score,
            ConclusionText  = dto.ConclusionText?.Trim(),
            SubmittedAt     = DateTime.UtcNow,
        };

        db.Submissions.Add(submission);
        await db.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(dto.ScreenshotBase64))
        {
            try
            {
                var imageData = Convert.FromBase64String(dto.ScreenshotBase64);
                db.SubmissionArtifacts.Add(new Models.SubmissionArtifact
                {
                    SubmissionId = submission.Id,
                    Kind         = "screenshot",
                    Data         = imageData,
                    ContentType  = "image/png",
                });
                await db.SaveChangesAsync();
            }
            catch (FormatException) { }
        }

        var student = await db.Users.FindAsync(userId);
        return ToResult(submission, student!);
    }

    private static Dictionary<string, double> DeserializeMetrics(string json)
    {
        return JsonSerializer.Deserialize<Dictionary<string, double>>(json, JsonOpts)
            ?? new Dictionary<string, double>();
    }

    private static List<ComparisonRowDto> DeserializeRows(string json)
    {
        return JsonSerializer.Deserialize<List<ComparisonRowDto>>(json, JsonOpts)
            ?? [];
    }

    private static SubmissionResultDto ToResult(Submission s, ApplicationUser student) =>
        new(s.Id,
            s.StudentId,
            $"{student.FirstName} {student.LastName}".Trim() is { Length: > 0 } n
                ? n : student.UserName ?? s.StudentId,
            s.Score,
            !string.IsNullOrWhiteSpace(s.ConclusionText),
            s.SubmittedAt,
            DeserializeRows(s.GradingRows));

    private static AssignmentSummaryDto ToSummary(
        Assignment a, int submissionCount, SubmissionResultDto? mySubmission) =>
        new(a.Id, a.ClassroomId, a.ModuleId, a.Title, a.Description,
            a.DueAt, a.CreatedAt, submissionCount, mySubmission);
}
