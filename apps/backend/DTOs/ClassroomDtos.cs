using System.ComponentModel.DataAnnotations;
using Physis.Api.Models;

namespace Physis.Api.DTOs;

public record ClassroomCreateDto(
    [Required, StringLength(100, MinimumLength = 1)] string Name,
    [StringLength(500)] string? Description
);

public record ClassroomUpdateDto(
    [Required, StringLength(100, MinimumLength = 1)] string Name,
    [StringLength(500)] string? Description,
    bool IsArchived
);

public record JoinClassroomDto(
    [Required, StringLength(8, MinimumLength = 8)] string InviteCode
);

public record ClassroomSummaryDto(
    Guid Id,
    string Name,
    string? Description,
    string OwnerId,
    string OwnerName,
    string InviteCode,
    bool IsArchived,
    DateTime CreatedAt,
    ClassroomRole MyRole,
    int MemberCount
);

public record ClassroomDetailDto(
    Guid Id,
    string Name,
    string? Description,
    string OwnerId,
    string OwnerName,
    string InviteCode,
    bool IsArchived,
    DateTime CreatedAt,
    ClassroomRole MyRole,
    List<ClassroomMemberDto> Members
);

public record ClassroomMemberDto(
    string UserId,
    string UserName,
    string DisplayName,
    ClassroomRole Role,
    DateTime JoinedAt
);

public record RotateCodeResponse(string InviteCode);
