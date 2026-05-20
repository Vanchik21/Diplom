namespace Physis.Api.DTOs;

public record RegisterRequest(string Email, string UserName, string Password, string Role);

public record ChangeRoleRequest(string Role);

public record LoginRequest(string Email, string Password);

public record RefreshRequest(string RefreshToken);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    string Email,
    string UserName);

public record CurrentUserResponse(string Id, string Email, string UserName);
