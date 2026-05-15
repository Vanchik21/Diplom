namespace Physis.Api.DTOs;

public record GdprExportDto(
    GdprProfileDto Profile,
    IReadOnlyList<GdprScenarioDto> Scenarios);

public record GdprProfileDto(
    string Id,
    string Email,
    string UserName,
    string FirstName,
    string LastName,
    string University,
    string? Faculty,
    int? StudyYear,
    string? Bio,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record GdprScenarioDto(
    Guid Id,
    string ModuleId,
    string Name,
    string ParamsJson,
    string StateSnapshotJson,
    string PredictionsJson,
    DateTime CreatedAt);
