namespace Physis.Api.Models;

public class SavedScenario
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
    public string ModuleId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string ParamsJson { get; set; } = null!;
    public string StateSnapshotJson { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
