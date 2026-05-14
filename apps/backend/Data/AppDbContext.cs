using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Physis.Api.Models;

namespace Physis.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<SavedScenario> SavedScenarios => Set<SavedScenario>();

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
    }
}
