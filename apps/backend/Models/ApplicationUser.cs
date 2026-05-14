using Microsoft.AspNetCore.Identity;

namespace Physis.Api.Models;

public class ApplicationUser : IdentityUser
{
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string University { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string? Faculty { get; set; }
    public int? StudyYear { get; set; }
    public string? Bio { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
