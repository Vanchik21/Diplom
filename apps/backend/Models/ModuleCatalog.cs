namespace Physis.Api.Models;

public record ModuleEntry(string Id, string NameUk, string NameEn, string Category);

public static class ModuleCatalog
{
    public static readonly IReadOnlyList<ModuleEntry> Entries =
    [
        new("rigid-body-pendulum", "Маятник (жорстке тіло)",  "Rigid-Body Pendulum",    "mechanics"),
        new("double-pendulum",     "Подвійний маятник",        "Double Pendulum",         "mechanics"),
        new("collision-2d",        "Зіткнення 2D",             "2D Collision",            "mechanics"),
        new("lorentz-particle",    "Частинка Лоренца",         "Lorentz Particle",        "em"),
        new("rc-circuit",          "RC-ланцюг",                "RC Circuit",              "em"),
        new("standing-wave",       "Стояча хвиля",             "Standing Wave",           "waves"),
        new("wave-interference",   "Інтерференція хвиль",      "Wave Interference",       "waves"),
        new("ideal-gas",           "Ідеальний газ",            "Ideal Gas",               "thermo"),
        new("gas-diffusion",       "Дифузія газу",             "Gas Diffusion",           "thermo"),
        new("planet-orbit",        "Орбіта планети",           "Planet Orbit",            "gravity"),
        new("three-body",          "Задача трьох тіл",         "Three-Body Problem",      "gravity"),
        new("build-atom",          "Конструктор атома",        "Build Atom",              "quantum"),
    ];

    private static readonly Dictionary<string, string> _categoryById =
        Entries.ToDictionary(e => e.Id, e => e.Category);

    public static string? GetCategory(string moduleId) =>
        _categoryById.TryGetValue(moduleId, out var cat) ? cat : null;
}
