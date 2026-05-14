using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Physis.Api.DTOs;
using Physis.Api.Services;

namespace Physis.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/profile")]
public class ProfileController(ProfileService profileService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ProfileResponse>> GetProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var profile = await profileService.GetProfileAsync(userId);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut]
    public async Task<ActionResult<ProfileResponse>> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var (success, errors) = await profileService.UpdateProfileAsync(userId, request);
        if (!success) return BadRequest(new { errors });

        var profile = await profileService.GetProfileAsync(userId);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPost("avatar")]
    [RequestSizeLimit(6_291_456)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<object>> UploadAvatar(IFormFile file)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        if (file is null || file.Length == 0)
            return BadRequest(new { error = "Файл не завантажено." });

        var (success, avatarUrl, error) = await profileService.UploadAvatarAsync(userId, file);
        if (!success) return BadRequest(new { error });

        return Ok(new { avatarUrl });
    }
}
