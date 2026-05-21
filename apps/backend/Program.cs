using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Physis.Api.Data;
using Physis.Api.Endpoints;
using Physis.Api.Middleware;
using Physis.Api.Models;
using Physis.Api.Services;

using QuestPDF.Infrastructure;
QuestPDF.Settings.License = LicenseType.Community;

const string AdminRole = "Admin";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<ScenarioService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<ClassroomService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<AssignmentService>();
builder.Services.AddScoped<AnalyticsService>();
builder.Services.AddScoped<LabReportService>();

if (!builder.Environment.IsDevelopment())
{
    builder.Services.AddHsts(options =>
    {
        options.MaxAge = TimeSpan.FromDays(365);
        options.IncludeSubDomains = true;
    });
}

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200"];

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var connStr = builder.Configuration.GetConnectionString("Default") ?? "";
    var host = connStr.Split(';')
        .Select(p => p.Trim())
        .FirstOrDefault(p => p.StartsWith("Host=", StringComparison.OrdinalIgnoreCase))
        ?.Split('=', 2).ElementAtOrDefault(1) ?? "unknown";
    app.Logger.LogInformation("Database host: {Host}", host);
    if (db.Database.IsRelational())
        db.Database.Migrate();
    else
        db.Database.EnsureCreated();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    foreach (var roleName in new[] { AdminRole, "Teacher", "Student" })
        if (!await roleManager.RoleExistsAsync(roleName))
            await roleManager.CreateAsync(new IdentityRole(roleName));

    if (app.Environment.IsDevelopment())
    {
        var seedEmail    = builder.Configuration["AdminSeed:Email"]    ?? string.Empty;
        var seedUserName = builder.Configuration["AdminSeed:UserName"] ?? string.Empty;
        var seedPassword = builder.Configuration["AdminSeed:Password"] ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(seedEmail) &&
            !string.IsNullOrWhiteSpace(seedUserName) &&
            !string.IsNullOrWhiteSpace(seedPassword))
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var existing = await userManager.FindByEmailAsync(seedEmail);
            if (existing is null)
            {
                var adminUser = new ApplicationUser
                {
                    Email    = seedEmail,
                    UserName = seedUserName,
                };
                var createResult = await userManager.CreateAsync(adminUser, seedPassword);
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, AdminRole);
                    app.Logger.LogInformation("Dev admin account created: {Email}", seedEmail);
                }
                else
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    app.Logger.LogWarning("Dev admin seed failed: {Errors}", errors);
                }
            }
            else
            {
                // Reset password for existing admin account on every dev startup
                var resetToken = await userManager.GeneratePasswordResetTokenAsync(existing);
                await userManager.ResetPasswordAsync(existing, resetToken, seedPassword);
                if (!await userManager.IsInRoleAsync(existing, AdminRole))
                    await userManager.AddToRoleAsync(existing, AdminRole);
                app.Logger.LogInformation("Dev admin password reset for: {Email}", seedEmail);
            }
        }
        else
        {
            app.Logger.LogInformation(
                "AdminSeed:Password not set — skipping dev admin seed. " +
                "Set the AdminSeed__Password environment variable to enable it.");
        }
    }

    var webRoot = app.Environment.WebRootPath
        ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
    Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "avatars"));
}

app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("Referrer-Policy", "no-referrer");
    context.Response.Headers.Append(
        "Content-Security-Policy",
        "default-src 'none'; img-src 'self'; frame-ancestors 'none'");
    await next();
});

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

app.UseStaticFiles();
app.UseCors();
app.UseAuthentication();
app.UseMiddleware<TokenVersionMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHealthEndpoints();

app.Run();

public partial class Program { }
