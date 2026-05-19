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
    public DbSet<Assignment>           Assignments           => Set<Assignment>();
    public DbSet<Submission>           Submissions           => Set<Submission>();
    public DbSet<SubmissionArtifact>   SubmissionArtifacts   => Set<SubmissionArtifact>();

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

        builder.Entity<Assignment>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).ValueGeneratedOnAdd();
            e.Property(a => a.ModuleId).HasMaxLength(50).IsRequired();
            e.Property(a => a.Title).HasMaxLength(200).IsRequired();
            e.Property(a => a.Description).HasMaxLength(1000);
            e.Property(a => a.ExpectedMetrics).HasColumnType("text").HasDefaultValue("{}");
            e.Property(a => a.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(a => a.Classroom)
             .WithMany()
             .HasForeignKey(a => a.ClassroomId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.CreatedBy)
             .WithMany()
             .HasForeignKey(a => a.CreatedById)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Submission>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).ValueGeneratedOnAdd();
            e.Property(s => s.ObservedMetrics).HasColumnType("text").HasDefaultValue("{}");
            e.Property(s => s.GradingRows).HasColumnType("text").HasDefaultValue("[]");
            e.Property(s => s.ConclusionText).HasMaxLength(2000);
            e.Property(s => s.SubmittedAt).HasDefaultValueSql("now()");
            e.HasIndex(s => new { s.AssignmentId, s.StudentId }).IsUnique();
            e.HasOne(s => s.Assignment)
             .WithMany(a => a.Submissions)
             .HasForeignKey(s => s.AssignmentId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.Student)
             .WithMany()
             .HasForeignKey(s => s.StudentId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.Artifact)
             .WithOne(a => a.Submission)
             .HasForeignKey<SubmissionArtifact>(a => a.SubmissionId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<SubmissionArtifact>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).ValueGeneratedOnAdd();
            e.Property(a => a.Kind).HasMaxLength(50).IsRequired();
            e.Property(a => a.ContentType).HasMaxLength(100).IsRequired();
            e.HasIndex(a => a.SubmissionId).IsUnique();
        });
    }
}
