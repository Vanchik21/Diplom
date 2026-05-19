namespace Physis.Api.Models;

public sealed class Assignment
{
    public Guid Id { get; set; }
    public Guid ClassroomId { get; set; }
    public string ModuleId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string ExpectedMetrics { get; set; } = "{}";
    public DateTime? DueAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedById { get; set; } = null!;

    public Classroom Classroom { get; set; } = null!;
    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
