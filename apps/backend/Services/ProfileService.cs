using Microsoft.AspNetCore.Identity;
using Physis.Api.DTOs;
using Physis.Api.Models;

namespace Physis.Api.Services;

public class ProfileService(
    UserManager<ApplicationUser> userManager,
    IWebHostEnvironment env,
    ILogger<ProfileService> logger)
{
    private static readonly HashSet<string> AllowedMimeTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
    ];

    private const long MaxFileSizeBytes = 5 * 1024 * 1024;

    public async Task<ProfileResponse?> GetProfileAsync(string userId)
    {
        var user = await userManager.FindByIdAsync(userId);
        return user is null ? null : MapToResponse(user);
    }

    public async Task<(bool Success, IEnumerable<string> Errors)> UpdateProfileAsync(
        string userId, UpdateProfileRequest request)
    {
        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return (false, ["Користувача не знайдено."]);

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.University = request.University.Trim();
        user.Faculty = request.Faculty?.Trim();
        user.StudyYear = request.StudyYear;
        user.Bio = request.Bio?.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return (false, result.Errors.Select(e => e.Description));

        logger.LogInformation("Profile updated for user {UserId}", userId);
        return (true, []);
    }

    public async Task<(bool Success, string? AvatarUrl, string? Error)> UploadAvatarAsync(
        string userId, IFormFile file)
    {
        if (file.Length == 0)
            return (false, null, "Файл порожній.");

        if (file.Length > MaxFileSizeBytes)
            return (false, null, "Файл занадто великий. Максимальний розмір — 5 МБ.");

        var contentType = file.ContentType.ToLowerInvariant();
        if (!AllowedMimeTypes.Contains(contentType))
            return (false, null, "Недозволений тип файлу. Дозволені формати: JPEG, PNG, WebP.");

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        if (!IsValidImageSignature(bytes, contentType))
        {
            logger.LogWarning(
                "Avatar upload rejected for user {UserId}: magic bytes do not match content-type {ContentType}",
                userId, contentType);
            return (false, null, "Вміст файлу не відповідає зазначеному типу.");
        }

        var ext = contentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => throw new InvalidOperationException("Unreachable: content type already validated."),
        };

        var fileName = $"{Guid.NewGuid()}{ext}";
        var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        var uploadsDir = Path.Combine(webRoot, "uploads", "avatars");
        Directory.CreateDirectory(uploadsDir);

        var filePath = Path.Combine(uploadsDir, fileName);
        await File.WriteAllBytesAsync(filePath, bytes);

        var user = await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            File.Delete(filePath);
            return (false, null, "Користувача не знайдено.");
        }

        if (!string.IsNullOrEmpty(user.AvatarUrl))
        {
            var oldFileName = Path.GetFileName(user.AvatarUrl);
            var oldPath = Path.Combine(uploadsDir, oldFileName);
            if (File.Exists(oldPath))
            {
                File.Delete(oldPath);
            }
        }

        var avatarUrl = $"/uploads/avatars/{fileName}";
        user.AvatarUrl = avatarUrl;
        user.UpdatedAt = DateTime.UtcNow;
        await userManager.UpdateAsync(user);

        logger.LogInformation("Avatar uploaded for user {UserId}, file: {FileName}", userId, fileName);
        return (true, avatarUrl, null);
    }

    private static bool IsValidImageSignature(byte[] bytes, string contentType)
    {
        if (bytes.Length < 12) return false;

        return contentType switch
        {
            "image/jpeg" =>
                bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
            "image/png" =>
                bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47 &&
                bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A,
            "image/webp" =>
                bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
                bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50,
            _ => false,
        };
    }

    private static ProfileResponse MapToResponse(ApplicationUser user) => new(
        user.Id,
        user.Email ?? string.Empty,
        user.UserName ?? string.Empty,
        user.FirstName,
        user.LastName,
        user.University,
        user.AvatarUrl,
        user.Faculty,
        user.StudyYear,
        user.Bio,
        user.IsActive,
        user.CreatedAt,
        user.UpdatedAt);
}
