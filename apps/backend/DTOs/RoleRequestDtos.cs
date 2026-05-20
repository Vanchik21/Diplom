namespace Physis.Api.DTOs;

public record SubmitRoleRequestDto(string RequestedRole);

public record RoleRequestDto(
    Guid Id,
    string UserId,
    string UserName,
    string UserEmail,
    string RequestedRole,
    string Status,
    DateTime CreatedAt);
