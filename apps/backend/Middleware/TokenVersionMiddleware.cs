using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Physis.Api.Models;

namespace Physis.Api.Middleware;

public class TokenVersionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, UserManager<ApplicationUser> userManager)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? context.User.FindFirstValue("sub");

            if (userId is not null)
            {
                var user = await userManager.FindByIdAsync(userId);

                if (user is null || user.IsDeleted)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { error = "Account not found." });
                    return;
                }

                if (!user.IsActive)
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new { error = "Account is deactivated." });
                    return;
                }

                var claimVersion = context.User.FindFirstValue("tokenVersion");
                if (claimVersion is not null && int.TryParse(claimVersion, out var version))
                {
                    if (version != user.TokenVersion)
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        await context.Response.WriteAsJsonAsync(new { error = "Token is no longer valid." });
                        return;
                    }
                }
            }
        }

        await next(context);
    }
}
