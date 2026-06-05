using Microsoft.EntityFrameworkCore;
using Physis.Api.Data;
using Physis.Api.DTOs;
using Physis.Api.Models;

namespace Physis.Api.Services;

public class ClassroomService(AppDbContext db, Microsoft.AspNetCore.Identity.UserManager<ApplicationUser> userManager)
{
    public async Task<ClassroomSummaryDto> CreateAsync(string userId, ClassroomCreateDto dto)
    {
        var code = await GenerateUniqueCodeAsync();

        var classroom = new Classroom
        {
            Name        = dto.Name,
            Description = dto.Description,
            OwnerId     = userId,
            InviteCode  = code,
            CreatedAt   = DateTime.UtcNow,
        };
        db.Classrooms.Add(classroom);

        var membership = new ClassroomMembership
        {
            ClassroomId = classroom.Id,
            UserId      = userId,
            Role        = ClassroomRole.Teacher,
            JoinedAt    = DateTime.UtcNow,
        };
        db.ClassroomMemberships.Add(membership);

        await db.SaveChangesAsync();

        var owner = await db.Users.FindAsync(userId);
        return ToSummary(classroom, ClassroomRole.Teacher, 1, owner!);
    }

    public async Task<List<ClassroomSummaryDto>> GetMineAsync(string userId)
    {
        return await db.ClassroomMemberships
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.Classroom.CreatedAt)
            .Select(m => new ClassroomSummaryDto(
                m.Classroom.Id,
                m.Classroom.Name,
                m.Classroom.Description,
                m.Classroom.OwnerId,
                m.Classroom.Owner.UserName!,
                m.Classroom.InviteCode,
                m.Classroom.IsArchived,
                m.Classroom.CreatedAt,
                m.Role,
                db.ClassroomMemberships.Count(cm => cm.ClassroomId == m.ClassroomId)
            ))
            .ToListAsync();
    }

    public async Task<ClassroomDetailDto?> GetDetailAsync(Guid classroomId, string userId)
    {
        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == classroomId && m.UserId == userId);
        if (membership is null) return null;

        var classroom = await db.Classrooms
            .Include(c => c.Owner)
            .Include(c => c.Memberships)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => c.Id == classroomId);
        if (classroom is null) return null;

        var members = classroom.Memberships
            .Select(m => new ClassroomMemberDto(
                m.UserId,
                m.User.UserName ?? string.Empty,
                $"{m.User.FirstName} {m.User.LastName}".Trim(),
                m.Role,
                m.JoinedAt
            ))
            .OrderBy(m => m.Role)
            .ThenBy(m => m.UserName)
            .ToList();

        return new ClassroomDetailDto(
            classroom.Id,
            classroom.Name,
            classroom.Description,
            classroom.OwnerId,
            classroom.Owner.UserName!,
            (membership.Role == ClassroomRole.Teacher || membership.Role == ClassroomRole.CoAuthor) ? classroom.InviteCode : string.Empty,
            classroom.IsArchived,
            classroom.CreatedAt,
            membership.Role,
            members
        );
    }

    public async Task<ClassroomSummaryDto?> UpdateAsync(Guid classroomId, string userId, ClassroomUpdateDto dto)
    {
        var (classroom, role) = await LoadWithRoleAsync(classroomId, userId);
        if (classroom is null || role != ClassroomRole.Teacher) return null;

        classroom.Name        = dto.Name;
        classroom.Description = dto.Description;
        classroom.IsArchived  = dto.IsArchived;
        await db.SaveChangesAsync();

        var memberCount = await db.ClassroomMemberships.CountAsync(m => m.ClassroomId == classroomId);
        return ToSummary(classroom, role, memberCount, classroom.Owner);
    }

    public async Task<ClassroomSummaryDto?> JoinAsync(string userId, string inviteCode)
    {
        var classroom = await db.Classrooms
            .Include(c => c.Owner)
            .Include(c => c.Memberships)
            .FirstOrDefaultAsync(c => c.InviteCode == inviteCode.ToUpper() && !c.IsArchived);

        if (classroom is null) return null;

        var alreadyMember = classroom.Memberships.Any(m => m.UserId == userId);
        if (alreadyMember) return null;

        var joiningUser = await userManager.FindByIdAsync(userId);
        var isTeacher   = joiningUser is not null && await userManager.IsInRoleAsync(joiningUser, "Teacher");
        var assignedRole = isTeacher ? ClassroomRole.CoAuthor : ClassroomRole.Student;

        var membership = new ClassroomMembership
        {
            ClassroomId = classroom.Id,
            UserId      = userId,
            Role        = assignedRole,
            JoinedAt    = DateTime.UtcNow,
        };
        db.ClassroomMemberships.Add(membership);
        await db.SaveChangesAsync();

        return ToSummary(classroom, assignedRole, classroom.Memberships.Count + 1, classroom.Owner);
    }

    public async Task<bool> RemoveMemberAsync(Guid classroomId, string requesterId, string targetUserId)
    {
        var (classroom, role) = await LoadWithRoleAsync(classroomId, requesterId);
        if (classroom is null || (role != ClassroomRole.Teacher && role != ClassroomRole.CoAuthor)) return false;

        var membership = await db.ClassroomMemberships
            .FirstOrDefaultAsync(m => m.ClassroomId == classroomId
                                   && m.UserId == targetUserId
                                   && m.Role == ClassroomRole.Student);
        if (membership is null) return false;

        db.ClassroomMemberships.Remove(membership);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<string?> RotateCodeAsync(Guid classroomId, string userId)
    {
        var (classroom, role) = await LoadWithRoleAsync(classroomId, userId);
        if (classroom is null || role != ClassroomRole.Teacher) return null;

        classroom.InviteCode = await GenerateUniqueCodeAsync();
        await db.SaveChangesAsync();
        return classroom.InviteCode;
    }

    private async Task<(Classroom? classroom, ClassroomRole role)> LoadWithRoleAsync(
        Guid classroomId, string userId)
    {
        var membership = await db.ClassroomMemberships
            .Include(m => m.Classroom)
                .ThenInclude(c => c.Owner)
            .FirstOrDefaultAsync(m => m.ClassroomId == classroomId && m.UserId == userId);

        return membership is null
            ? (null, default)
            : (membership.Classroom, membership.Role);
    }

    private async Task<string> GenerateUniqueCodeAsync()
    {
        while (true)
        {
            var code = InviteCodeGenerator.Generate();
            var exists = await db.Classrooms.AnyAsync(c => c.InviteCode == code);
            if (!exists) return code;
        }
    }

    private static ClassroomSummaryDto ToSummary(
        Classroom c, ClassroomRole myRole, int memberCount, ApplicationUser owner) =>
        new(c.Id, c.Name, c.Description, c.OwnerId, owner.UserName ?? string.Empty,
            c.InviteCode, c.IsArchived, c.CreatedAt, myRole, memberCount);
}
