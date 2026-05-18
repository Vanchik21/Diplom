namespace Physis.Api.Models;

public sealed class Classroom
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string OwnerId { get; set; } = null!;
    public string InviteCode { get; set; } = null!;
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; }

    public ApplicationUser Owner { get; set; } = null!;
    public ICollection<ClassroomMembership> Memberships { get; set; } = new List<ClassroomMembership>();
}
