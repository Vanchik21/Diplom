namespace Physis.Api.Models;

public enum SubmissionStatus { Submitted = 0, PendingReview = 1, ReviewedPublished = 2 }

public sealed class Submission
{
    public Guid Id { get; set; }
    public Guid AssignmentId { get; set; }
    public string StudentId { get; set; } = null!;
    public string ObservedMetrics { get; set; } = "{}";
    public string GradingRows { get; set; } = "[]";
    public double Score { get; set; }
    public string? ConclusionText { get; set; }
    public string? QuizAnswers { get; set; }
    // Used for Problem type: JSON dict {label -> studentValue}
    public string? ProblemAnswers { get; set; }
    public double? TeacherScore { get; set; }
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Submitted;
    public DateTime SubmittedAt { get; set; }

    public Assignment Assignment { get; set; } = null!;
    public ApplicationUser Student { get; set; } = null!;
    public SubmissionArtifact? Artifact { get; set; }
}
