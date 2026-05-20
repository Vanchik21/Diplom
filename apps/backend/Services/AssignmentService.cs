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

        if (membership is null ||
            (membership.Role != ClassroomRole.Teacher && membership.Role != ClassroomRole.CoAuthor))
            return null;

        var assignment = new Assignment
        {
            ClassroomId     = dto.ClassroomId,
            ModuleId        = dto.ModuleId,
            Title           = dto.Title,
            Description     = dto.Description,
            AssignmentType  = dto.AssignmentType,
            ExpectedMetrics = JsonSerializer.Serialize(dto.ExpectedMetrics ?? new Dictionary<string, double>()),
            Questions       = dto.Questions is { Count: > 0 }
                                ? JsonSerializer.Serialize(dto.Questions)
                                : null,
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

        var isTeacher = membership.Role == ClassroomRole.Teacher
                     || membership.Role == ClassroomRole.CoAuthor;

        var expected   = DeserializeMetrics(assignment.ExpectedMetrics);
        var questions  = DeserializeQuestions(assignment.Questions);

        var mySubmission = assignment.Submissions.FirstOrDefault(s => s.StudentId == userId);

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
            assignment.AssignmentType,
            expected,
            questions,
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

        if (membership is null ||
            (membership.Role != ClassroomRole.Teacher && membership.Role != ClassroomRole.CoAuthor))
            return false;

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

        double score;
        List<ComparisonRowDto> rows;
        string? quizAnswersJson = null;

        if (assignment.AssignmentType == AssignmentType.Quiz)
        {
            var questions = DeserializeQuestions(assignment.Questions) ?? [];
            var answers   = dto.QuizAnswers ?? [];
            quizAnswersJson = JsonSerializer.Serialize(answers);

            var correct = questions
                .Select((q, i) => i < answers.Count && answers[i] == q.CorrectIndex)
                .Count(ok => ok);

            score = questions.Count > 0 ? (double)correct / questions.Count : 0;
            rows  = [];
        }
        else
        {
            var expected = DeserializeMetrics(assignment.ExpectedMetrics);
            (score, rows) = GradingService.Grade(expected, dto.ObservedMetrics ?? new());
        }

        var submission = new Submission
        {
            AssignmentId    = assignmentId,
            StudentId       = userId,
            ObservedMetrics = JsonSerializer.Serialize(dto.ObservedMetrics ?? new Dictionary<string, double>()),
            GradingRows     = JsonSerializer.Serialize(rows),
            Score           = score,
            ConclusionText  = dto.ConclusionText?.Trim(),
            QuizAnswers     = quizAnswersJson,
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
        => JsonSerializer.Deserialize<Dictionary<string, double>>(json, JsonOpts)
           ?? new Dictionary<string, double>();

    private static List<QuizQuestionDto>? DeserializeQuestions(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        return JsonSerializer.Deserialize<List<QuizQuestionDto>>(json, JsonOpts);
    }

    private static List<ComparisonRowDto> DeserializeRows(string json)
        => JsonSerializer.Deserialize<List<ComparisonRowDto>>(json, JsonOpts) ?? [];

    public async Task<SubmissionResultDto?> GradeAsync(
        Guid submissionId, string teacherId, double teacherScore)
    {
        var submission = await db.Submissions
            .Include(s => s.Assignment)
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.Id == submissionId);
        if (submission is null) return null;

        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m =>
                m.ClassroomId == submission.Assignment.ClassroomId &&
                m.UserId == teacherId &&
                (m.Role == ClassroomRole.Teacher || m.Role == ClassroomRole.CoAuthor));
        if (membership is null) return null;

        submission.TeacherScore = Math.Clamp(teacherScore, 0.0, 1.0);
        await db.SaveChangesAsync();
        return ToResult(submission, submission.Student);
    }

    private static SubmissionResultDto ToResult(Submission s, ApplicationUser student) =>
        new(s.Id,
            s.StudentId,
            $"{student.FirstName} {student.LastName}".Trim() is { Length: > 0 } n
                ? n : student.UserName ?? s.StudentId,
            s.Score,
            s.TeacherScore,
            !string.IsNullOrWhiteSpace(s.ConclusionText),
            s.SubmittedAt,
            DeserializeRows(s.GradingRows));

    private static AssignmentSummaryDto ToSummary(
        Assignment a, int submissionCount, SubmissionResultDto? mySubmission) =>
        new(a.Id, a.ClassroomId, a.ModuleId, a.Title, a.Description,
            a.AssignmentType, a.DueAt, a.CreatedAt, submissionCount, mySubmission);
}
