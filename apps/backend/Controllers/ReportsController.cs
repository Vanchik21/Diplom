using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Physis.Api.Services;

namespace Physis.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/submissions")]
public class ReportsController(LabReportService reportService) : ControllerBase
{
    [HttpGet("{id:guid}/report.pdf")]
    public async Task<IActionResult> GetReport(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (userId is null) return Forbid();

        var pdf = await reportService.GenerateAsync(id, userId);
        if (pdf is null) return Forbid();

        return File(pdf, "application/pdf", $"physis-report-{id:N}.pdf");
    }
}
