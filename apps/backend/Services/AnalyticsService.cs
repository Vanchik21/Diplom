using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Physis.Api.Data;
using Physis.Api.DTOs;
using Physis.Api.Models;

namespace Physis.Api.Services;

public class AnalyticsService(AppDbContext db)
{
    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private static readonly string[] AllCategories =
        ["mechanics", "em", "waves", "thermo", "gravity", "quantum"];

    public async Task<ClassroomOverviewDto?> GetOverviewAsync(Guid classroomId, string userId)
    {
        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == classroomId && m.UserId == userId);

        if (membership is null ||
            (membership.Role != ClassroomRole.Teacher && membership.Role != ClassroomRole.CoAuthor))
            return null;

        var assignments = await db.Assignments
            .Where(a => a.ClassroomId == classroomId)
            .Include(a => a.Submissions)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

        var assignmentIds = assignments.Select(a => a.Id).ToList();

        var memberships = await db.ClassroomMemberships
            .Where(m => m.ClassroomId == classroomId && m.Role == ClassroomRole.Student)
            .Include(m => m.User)
            .ToListAsync();

        var submissionStats = assignmentIds.Count > 0
            ? await db.Submissions
                .Where(s => assignmentIds.Contains(s.AssignmentId))
                .GroupBy(s => s.StudentId)
                .Select(g => new
                {
                    StudentId = g.Key,
                    Count     = g.Count(),
                    AvgScore  = g.Average(s => s.TeacherScore ?? s.Score),
                    PassCount = g.Count(s => (s.TeacherScore ?? s.Score) >= 0.6),
                })
                .ToListAsync()
            : [];

        var statsByStudent = submissionStats.ToDictionary(x => x.StudentId);

        var assignmentDtos = assignments.Select(a =>
        {
            var count    = a.Submissions.Count;
            var avgScore = count > 0 ? a.Submissions.Average(s => s.TeacherScore ?? s.Score) : 0.0;
            var passRate = count > 0
                ? a.Submissions.Count(s => (s.TeacherScore ?? s.Score) >= 0.6) / (double)count
                : 0.0;

            var metricErrors = a.Submissions
                .SelectMany(s => ParseRows(s.GradingRows))
                .GroupBy(r => r.Key)
                .Select(g => new MetricStatsDto(g.Key, Median(g.Select(r => r.RelError).ToList())))
                .ToList();

            return new AssignmentStatsDto(a.Id, a.Title, count, avgScore, passRate, metricErrors);
        }).ToList();

        var studentDtos = memberships.Select(m =>
        {
            var s    = statsByStudent.TryGetValue(m.UserId, out var x) ? x : null;
            var name = DisplayName(m.User);
            return new StudentSummaryDto(
                m.UserId, name,
                s?.Count ?? 0,
                s?.AvgScore ?? 0.0,
                s is not null ? s.PassCount / (double)s.Count : 0.0);
        }).ToList();

        return new ClassroomOverviewDto(assignmentDtos, studentDtos);
    }

    public async Task<StudentTimelineDto?> GetStudentTimelineAsync(
        Guid classroomId, string studentId, string requesterId)
    {
        var requester = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == classroomId && m.UserId == requesterId);

        if (requester is null ||
            (requester.Role != ClassroomRole.Teacher && requester.Role != ClassroomRole.CoAuthor))
            return null;

        var student = await db.Users.FindAsync(studentId);
        if (student is null) return null;

        var assignmentIds = await db.Assignments
            .Where(a => a.ClassroomId == classroomId)
            .Select(a => a.Id)
            .ToListAsync();

        var submissions = assignmentIds.Count > 0
            ? await db.Submissions
                .Where(s => s.StudentId == studentId && assignmentIds.Contains(s.AssignmentId))
                .Include(s => s.Assignment)
                .OrderBy(s => s.SubmittedAt)
                .ToListAsync()
            : [];

        var scoreOverTime = submissions
            .Select(s => new ScorePointDto(s.SubmittedAt, s.TeacherScore ?? s.Score, s.Assignment.Title))
            .ToList();

        var mastery = ComputeMastery(submissions);

        return new StudentTimelineDto(studentId, DisplayName(student), scoreOverTime, mastery);
    }

    public async Task<PersonalAnalyticsDto> GetPersonalAsync(string userId)
    {
        var submissions = await db.Submissions
            .Where(s => s.StudentId == userId)
            .Include(s => s.Assignment)
            .ToListAsync();

        var scores = submissions.Select(s => s.TeacherScore ?? s.Score).ToList();
        var avgScore  = scores.Count > 0 ? (double?)scores.Average() : null;
        var passRate  = scores.Count > 0 ? scores.Count(s => s >= 0.6) / (double)scores.Count : 0.0;

        return new PersonalAnalyticsDto(ComputeMastery(submissions), scores.Count, avgScore, passRate);
    }

    private static Dictionary<string, double?> ComputeMastery(List<Submission> submissions)
    {
        return AllCategories.ToDictionary(
            cat => cat,
            cat =>
            {
                var scores = submissions
                    .Where(s => ModuleCatalog.GetCategory(s.Assignment.ModuleId) == cat)
                    .Select(s => s.TeacherScore ?? s.Score)
                    .ToList();

                return scores.Count > 0
                    ? (double?)scores.Average()
                    : null;
            });
    }

    private static List<GradingRowData> ParseRows(string json)
    {
        try { return JsonSerializer.Deserialize<List<GradingRowData>>(json, JsonOpts) ?? []; }
        catch { return []; }
    }

    private static double Median(List<double> values)
    {
        if (values.Count == 0) return 0.0;
        var sorted = values.Order().ToList();
        int mid = sorted.Count / 2;
        return sorted.Count % 2 == 0
            ? (sorted[mid - 1] + sorted[mid]) / 2.0
            : sorted[mid];
    }

    private static string DisplayName(ApplicationUser u) =>
        $"{u.FirstName} {u.LastName}".Trim() is { Length: > 0 } n
            ? n : u.UserName ?? u.Id;

    private record GradingRowData(
        string Key, double Expected, double Actual, double AbsError, double RelError);
}
