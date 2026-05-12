using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Physis.Api.DTOs;
using Physis.Api.Services;

namespace Physis.Api.Controllers;

[ApiController]
[Route("api/scenarios")]
[Authorize]
public class ScenariosController(ScenarioService scenarioService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ScenarioResponse>>> GetAll()
    {
        var userId = RequireUserId();
        return Ok(await scenarioService.GetAllForUserAsync(userId));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ScenarioResponse>> GetById(Guid id)
    {
        var userId = RequireUserId();
        var scenario = await scenarioService.GetByIdAsync(id, userId);
        return scenario is null ? NotFound() : Ok(scenario);
    }

    [HttpPost]
    public async Task<ActionResult<ScenarioResponse>> Create(CreateScenarioRequest request)
    {
        var userId = RequireUserId();
        var created = await scenarioService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = RequireUserId();
        var deleted = await scenarioService.DeleteAsync(id, userId);
        return deleted ? NoContent() : NotFound();
    }

    private string RequireUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException("User ID not found in token.");
}
