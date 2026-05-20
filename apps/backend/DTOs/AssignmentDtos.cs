using System.ComponentModel.DataAnnotations;

namespace Physis.Api.DTOs;

public record AssignmentCreateDto(
    Guid ClassroomId,
    [Required, StringLength(50, MinimumLength = 1)] string ModuleId,
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(1000)] string? Description,
    Dictionary<string, double>? ExpectedMetrics,
    DateTime? DueAt
);

public record SubmitAssignmentDto(
    [Required] Dictionary<string, double> ObservedMetrics,
    [StringLength(2000)] string? ConclusionText,
    string? ScreenshotBase64
);

public record ComparisonRowDto(
    string Key,
    double Expected,
    double Actual,
    double AbsError,
    double RelError
);

public record SubmissionResultDto(
    Guid   Id,
    string StudentId,
    string StudentName,
    double Score,
    bool   HasConclusion,
    DateTime SubmittedAt,
    List<ComparisonRowDto> GradingRows
);

public record AssignmentSummaryDto(
    Guid Id,
    Guid ClassroomId,
    string ModuleId,
    string Title,
    string? Description,
    DateTime? DueAt,
    DateTime CreatedAt,
    int SubmissionCount,
    SubmissionResultDto? MySubmission
);

public record AssignmentDetailDto(
    Guid Id,
    Guid ClassroomId,
    string ModuleId,
    string Title,
    string? Description,
    Dictionary<string, double> ExpectedMetrics,
    DateTime? DueAt,
    DateTime CreatedAt,
    bool IsTeacher,
    SubmissionResultDto? MySubmission,
    List<SubmissionResultDto> Submissions
);
