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
    bool IsAdmin,
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
