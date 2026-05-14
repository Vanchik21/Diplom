using System.ComponentModel.DataAnnotations;

namespace Physis.Api.DTOs;

public record ProfileResponse(
    string Id,
    string Email,
    string UserName,
    string FirstName,
    string LastName,
    string University,
    string? AvatarUrl,
    string? Faculty,
    int? StudyYear,
    string? Bio,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public class UpdateProfileRequest
{
    [Required(ErrorMessage = "Ім'я є обов'язковим.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Ім'я має містити від 1 до 100 символів.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Прізвище є обов'язковим.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Прізвище має містити від 1 до 100 символів.")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Назва навчального закладу є обов'язковою.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Назва ВНЗ має містити від 1 до 200 символів.")]
    public string University { get; set; } = string.Empty;

    [StringLength(200, ErrorMessage = "Назва факультету не може перевищувати 200 символів.")]
    public string? Faculty { get; set; }

    [Range(1, 6, ErrorMessage = "Курс має бути від 1 до 6.")]
    public int? StudyYear { get; set; }

    [StringLength(500, ErrorMessage = "Біографія не може перевищувати 500 символів.")]
    public string? Bio { get; set; }
}
