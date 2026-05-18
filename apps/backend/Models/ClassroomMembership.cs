namespace Physis.Api.Models;

public sealed class ClassroomMembership
{
    public Guid Id { get; set; }
    public Guid ClassroomId { get; set; }
    public string UserId { get; set; } = null!;
    public ClassroomRole Role { get; set; }
    public DateTime JoinedAt { get; set; }

    public Classroom Classroom { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}

public enum ClassroomRole { Teacher = 1, Student = 2 }
