namespace Physis.Api.DTOs;

public record ModuleCatalogEntryDto(
    string Id,
    string NameUk,
    string NameEn,
    string Category);

public record MetricStatsDto(string Key, double MedianRelError);

public record AssignmentStatsDto(
    Guid   Id,
    string Title,
    int    SubmissionCount,
    double AverageScore,
    double PassRate,
    List<MetricStatsDto> MetricErrors);

public record StudentSummaryDto(
    string UserId,
    string StudentName,
    int    SubmissionCount,
    double AverageScore,
    double PassRate);

public record ClassroomOverviewDto(
    List<AssignmentStatsDto> Assignments,
    List<StudentSummaryDto>  Students);

public record ScorePointDto(DateTime SubmittedAt, double Score, string AssignmentTitle);

public record StudentTimelineDto(
    string UserId,
    string StudentName,
    List<ScorePointDto>         ScoreOverTime,
    Dictionary<string, double?> CategoryMastery);

public record PersonalAnalyticsDto(
    Dictionary<string, double?> CategoryMastery,
    int    TotalSubmissions,
    double? AverageScore,
    double PassRate);
