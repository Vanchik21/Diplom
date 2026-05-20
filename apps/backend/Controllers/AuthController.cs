using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Physis.Api.DTOs;
using Physis.Api.Models;
using Physis.Api.Services;

namespace Physis.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    TokenService tokenService) : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles = ["Student", "Teacher"];

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (!AllowedRoles.Contains(request.Role))
            return BadRequest(new { error = "Role must be 'Student' or 'Teacher'." });

        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.UserName,
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        await userManager.AddToRoleAsync(user, request.Role);

        return Ok(await IssueTokens(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized("Invalid credentials.");

        return Ok(await IssueTokens(user));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        var user = userManager.Users
            .SingleOrDefault(u => u.RefreshToken == request.RefreshToken);

        if (user is null || user.RefreshTokenExpiry < DateTime.UtcNow)
            return Unauthorized("Invalid or expired refresh token.");

        return Ok(await IssueTokens(user));
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<CurrentUserResponse> Me()
    {
        var id = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                 ?? User.FindFirst("sub")?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value
                    ?? User.FindFirst("email")?.Value;
        var userName = User.Identity?.Name;

        if (id is null || email is null || userName is null)
            return Unauthorized();

        return Ok(new CurrentUserResponse(id, email, userName));
    }

    [Authorize(Roles = "Admin")]
    [HttpPatch("/api/users/me/role")]
    public async Task<ActionResult<AuthResponse>> ChangeRole(ChangeRoleRequest request)
    {
        if (!AllowedRoles.Contains(request.Role))
            return BadRequest(new { error = "Role must be 'Student' or 'Teacher'." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                     ?? User.FindFirstValue("sub");
        if (userId is null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Contains("Admin"))
            return BadRequest(new { error = "Admin role cannot be changed." });

        if (currentRoles.Count > 0)
            await userManager.RemoveFromRolesAsync(user, currentRoles);

        await userManager.AddToRoleAsync(user, request.Role);

        return Ok(await IssueTokens(user));
    }

    private async Task<AuthResponse> IssueTokens(ApplicationUser user)
    {
        var accessToken = await tokenService.GenerateAccessTokenAsync(user);
        var refreshToken = tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(tokenService.RefreshTokenExpirationDays);
        await userManager.UpdateAsync(user);

        return new AuthResponse(accessToken, refreshToken, user.Email!, user.UserName!);
    }
}
