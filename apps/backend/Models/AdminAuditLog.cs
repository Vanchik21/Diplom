namespace Physis.Api.Models;

public class AdminAuditLog
{
    public Guid Id { get; set; }
    public string AdminId { get; set; } = null!;
    public ApplicationUser Admin { get; set; } = null!;
    public string Action { get; set; } = null!;
    public string TargetUserId { get; set; } = null!;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}
