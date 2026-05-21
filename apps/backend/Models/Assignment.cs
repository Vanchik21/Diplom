namespace Physis.Api.Models;

public enum AssignmentType { Poe = 0, Scenario = 1, Quiz = 2, Problem = 3 }

public sealed class Assignment
{
    public Guid Id { get; set; }
    public Guid ClassroomId { get; set; }
    public string ModuleId { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public AssignmentType AssignmentType { get; set; } = AssignmentType.Poe;
    public string ExpectedMetrics { get; set; } = "{}";
    public string? Questions { get; set; }
    // Used for Problem type: JSON array of {label, unit, correctValue, tolerance}
    public string? AnswerFieldsJson { get; set; }
    public DateTime? DueAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedById { get; set; } = null!;

    public Classroom Classroom { get; set; } = null!;
    public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
