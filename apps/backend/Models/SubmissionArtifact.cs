namespace Physis.Api.Models;

public sealed class SubmissionArtifact
{
    public Guid Id { get; set; }
    public Guid SubmissionId { get; set; }
    public string Kind { get; set; } = null!;
    public byte[] Data { get; set; } = null!;
    public string ContentType { get; set; } = null!;

    public Submission Submission { get; set; } = null!;
}
