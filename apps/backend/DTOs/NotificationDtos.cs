namespace Physis.Api.DTOs;

public record NotificationDto(
    Guid Id,
    string Message,
    string? Link,
    bool IsRead,
    DateTime CreatedAt
);
