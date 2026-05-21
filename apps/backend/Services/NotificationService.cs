using Microsoft.EntityFrameworkCore;
using Physis.Api.Data;
using Physis.Api.DTOs;
using Physis.Api.Models;

namespace Physis.Api.Services;

public class NotificationService(AppDbContext db)
{
    public async Task CreateAsync(string userId, string message, string? link = null)
    {
        db.Notifications.Add(new Notification
        {
            UserId    = userId,
            Message   = message,
            Link      = link,
            IsRead    = false,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    public async Task CreateManyAsync(IEnumerable<string> userIds, string message, string? link = null)
    {
        var now = DateTime.UtcNow;
        foreach (var uid in userIds)
        {
            db.Notifications.Add(new Notification
            {
                UserId    = uid,
                Message   = message,
                Link      = link,
                IsRead    = false,
                CreatedAt = now,
            });
        }
        await db.SaveChangesAsync();
    }

    public async Task<List<NotificationDto>> GetForUserAsync(string userId, int limit = 50)
    {
        return await db.Notifications
            .Where(n => n.UserId == userId)
            .OrderBy(n => n.IsRead)
            .ThenByDescending(n => n.CreatedAt)
            .Take(limit)
            .Select(n => new NotificationDto(n.Id, n.Message, n.Link, n.IsRead, n.CreatedAt))
            .ToListAsync();
    }

    public async Task<bool> MarkReadAsync(Guid id, string userId)
    {
        var n = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (n is null) return false;
        n.IsRead = true;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task MarkAllReadAsync(string userId)
    {
        await db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
    }

    public async Task<int> UnreadCountAsync(string userId)
        => await db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);
}
