using Microsoft.EntityFrameworkCore;
using Physis.Api.Data;
using Physis.Api.DTOs;
using Physis.Api.Models;

namespace Physis.Api.Services;

public class ScenarioService(AppDbContext db)
{
    public async Task<List<ScenarioResponse>> GetAllForUserAsync(string userId)
    {
        return await db.SavedScenarios
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => ToResponse(s))
            .ToListAsync();
    }

    public async Task<ScenarioResponse?> GetByIdAsync(Guid id, string userId)
    {
        var scenario = await db.SavedScenarios
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

        return scenario is null ? null : ToResponse(scenario);
    }

    public async Task<ScenarioResponse> CreateAsync(string userId, CreateScenarioRequest request)
    {
        var scenario = new SavedScenario
        {
            UserId = userId,
            ModuleId = request.ModuleId,
            Name = request.Name,
            ParamsJson = request.ParamsJson,
            StateSnapshotJson = request.StateSnapshotJson,
            CreatedAt = DateTime.UtcNow,
        };

        db.SavedScenarios.Add(scenario);
        await db.SaveChangesAsync();

        return ToResponse(scenario);
    }

    public async Task<bool> DeleteAsync(Guid id, string userId)
    {
        var scenario = await db.SavedScenarios
            .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

        if (scenario is null) return false;

        db.SavedScenarios.Remove(scenario);
        await db.SaveChangesAsync();
        return true;
    }

    private static ScenarioResponse ToResponse(SavedScenario s) =>
        new(s.Id, s.ModuleId, s.Name, s.ParamsJson, s.StateSnapshotJson, s.CreatedAt);
}
