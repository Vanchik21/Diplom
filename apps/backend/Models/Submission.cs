namespace Physis.Api.Models;

public sealed class Submission
{
    public Guid Id { get; set; }
    public Guid AssignmentId { get; set; }
    public string StudentId { get; set; } = null!;
    public string ObservedMetrics { get; set; } = "{}";
    public string GradingRows { get; set; } = "[]";
    public double Score { get; set; }
    public string? ConclusionText { get; set; }
    public DateTime SubmittedAt { get; set; }

    public Assignment Assignment { get; set; } = null!;
    public ApplicationUser Student { get; set; } = null!;
    public SubmissionArtifact? Artifact { get; set; }
}
