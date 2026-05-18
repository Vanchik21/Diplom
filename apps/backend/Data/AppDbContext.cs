using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Physis.Api.Models;

namespace Physis.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<SavedScenario>        SavedScenarios        => Set<SavedScenario>();
    public DbSet<Classroom>            Classrooms            => Set<Classroom>();
    public DbSet<ClassroomMembership>  ClassroomMemberships  => Set<ClassroomMembership>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(e =>
        {
            e.Property(u => u.FirstName).HasMaxLength(100).HasDefaultValue(string.Empty);
            e.Property(u => u.LastName).HasMaxLength(100).HasDefaultValue(string.Empty);
            e.Property(u => u.University).HasMaxLength(200).HasDefaultValue(string.Empty);
            e.Property(u => u.Faculty).HasMaxLength(200);
            e.Property(u => u.Bio).HasMaxLength(500);
            e.Property(u => u.CreatedAt).HasDefaultValueSql("now()");
            e.Property(u => u.UpdatedAt).HasDefaultValueSql("now()");
        });

        builder.Entity<SavedScenario>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).ValueGeneratedOnAdd();
            e.Property(s => s.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(s => s.User)
             .WithMany()
             .HasForeignKey(s => s.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Classroom>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).ValueGeneratedOnAdd();
            e.Property(c => c.Name).HasMaxLength(100).IsRequired();
            e.Property(c => c.Description).HasMaxLength(500);
            e.Property(c => c.InviteCode).HasMaxLength(8).IsRequired();
            e.Property(c => c.CreatedAt).HasDefaultValueSql("now()");
            e.HasIndex(c => c.InviteCode).IsUnique();
            e.HasOne(c => c.Owner)
             .WithMany()
             .HasForeignKey(c => c.OwnerId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ClassroomMembership>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.Id).ValueGeneratedOnAdd();
            e.Property(m => m.JoinedAt).HasDefaultValueSql("now()");
            e.HasIndex(m => new { m.ClassroomId, m.UserId }).IsUnique();
            e.HasOne(m => m.Classroom)
             .WithMany(c => c.Memberships)
             .HasForeignKey(m => m.ClassroomId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.User)
             .WithMany()
             .HasForeignKey(m => m.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
