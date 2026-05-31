using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace Physis.Api.Services;

public class SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger) : IEmailService
{
    public async Task SendAsync(string to, string subject, string body)
    {
        var host     = config["Email:SmtpHost"];
        var portStr  = config["Email:SmtpPort"];
        var from     = config["Email:From"];
        var password = config["Email:Password"];
        var username = config["Email:Username"] ?? from;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
        {
            logger.LogDebug("Email not configured — skipping send to {To}", to);
            return;
        }

        try
        {
            int port = int.TryParse(portStr, out var p) ? p : 587;

            using var client = new SmtpClient(host, port)
            {
                EnableSsl   = true,
                Credentials = new NetworkCredential(username, password),
            };

            var msg = new MailMessage(from, to, subject, body) { IsBodyHtml = false };
            await client.SendMailAsync(msg);
            logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to send email to {To}", to);
        }
    }
}
