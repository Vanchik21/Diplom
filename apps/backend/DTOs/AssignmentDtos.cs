using System.ComponentModel.DataAnnotations;
using Physis.Api.Models;

namespace Physis.Api.DTOs;

public record QuizQuestionDto(
    [Required] string Text,
    [Required] List<string> Options,
    int CorrectIndex
);

// Used for Problem-type assignments
public record AnswerFieldDto(
    [Required] string Label,
    string? Unit,
    double CorrectValue,
    double Tolerance
);

public record AssignmentCreateDto(
    Guid ClassroomId,
    [Required, StringLength(50, MinimumLength = 1)] string ModuleId,
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(1000)] string? Description,
    AssignmentType AssignmentType,
    Dictionary<string, double>? ExpectedMetrics,
    List<QuizQuestionDto>? Questions,
    // For Problem type
    List<AnswerFieldDto>? AnswerFields,
    DateTime? DueAt
);

public record SubmitAssignmentDto(
    Dictionary<string, double>? ObservedMetrics,
    [StringLength(2000)] string? ConclusionText,
    string? ScreenshotBase64,
    List<int>? QuizAnswers,
    // For Problem type: label -> student's value
    Dictionary<string, double>? ProblemAnswers
);

public record ComparisonRowDto(
    string Key,
    double Expected,
    double Actual,
    double AbsError,
    double RelError
);

public record GradeSubmissionDto(
    [Range(0.0, 1.0)] double TeacherScore,
    [StringLength(1000)] string? Comment
);

public record SubmissionResultDto(
    Guid   Id,
    string StudentId,
    string StudentName,
    double Score,
    double? TeacherScore,
    string? TeacherComment,
    bool   HasConclusion,
    DateTime SubmittedAt,
    List<ComparisonRowDto> GradingRows,
    string Status
);

public record AssignmentSummaryDto(
    Guid Id,
    Guid ClassroomId,
    string ModuleId,
    string Title,
    string? Description,
    AssignmentType AssignmentType,
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
    AssignmentType AssignmentType,
    Dictionary<string, double> ExpectedMetrics,
    List<QuizQuestionDto>? Questions,
    List<AnswerFieldDto>? AnswerFields,
    DateTime? DueAt,
    DateTime CreatedAt,
    bool IsTeacher,
    SubmissionResultDto? MySubmission,
    List<SubmissionResultDto> Submissions
);
