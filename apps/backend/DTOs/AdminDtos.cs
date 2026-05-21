namespace Physis.Api.DTOs;

public record AdminUserDto(
    string Id,
    string Email,
    string UserName,
    string FirstName,
    string LastName,
    string University,
    string? AvatarUrl,
    bool IsActive,
    bool IsDeleted,
    bool IsAdmin,
    string Role,
    DateTime CreatedAt);

public record AdminStatsDto(
    int TotalUsers,
    int ActiveUsers,
    int AdminUsers,
    int TotalScenarios);

public record PagedResult<T>(
    IReadOnlyList<T> Items,
    int TotalCount,
    int Page,
    int PageSize);

public record SetRoleRequest(bool IsAdmin);

public record ApproveRoleRequestDto(string Role);

public record AdminAuditLogDto(
    Guid Id,
    string AdminId,
    string AdminName,
    string Action,
    string TargetUserId,
    string TargetUserName,
    string? Details,
    DateTime CreatedAt);
