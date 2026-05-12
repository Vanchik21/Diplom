namespace Physis.Api.DTOs;

public record CreateScenarioRequest(
    string ModuleId,
    string Name,
    string ParamsJson,
    string StateSnapshotJson);

public record ScenarioResponse(
    Guid Id,
    string ModuleId,
    string Name,
    string ParamsJson,
    string StateSnapshotJson,
    DateTime CreatedAt);
