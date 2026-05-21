namespace Physis.Api.Models;

public sealed class Notification
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = null!;
    public string Message { get; set; } = null!;
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }

    public ApplicationUser User { get; set; } = null!;
}
