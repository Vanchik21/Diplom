using Physis.Api.DTOs;

namespace Physis.Api.Services;

public static class GradingService
{
    public static (double Score, List<ComparisonRowDto> Rows) Grade(
        Dictionary<string, double> expected,
        Dictionary<string, double> observed)
    {
        if (expected.Count == 0)
            return (1.0, []);

        var rows = new List<ComparisonRowDto>();

        foreach (var (key, exp) in expected)
        {
            if (!observed.TryGetValue(key, out var actual))
                continue;

            var absError = Math.Abs(actual - exp);
            var relError = Math.Abs(exp) < 1e-12
                ? (Math.Abs(actual) < 1e-12 ? 0.0 : 1.0)
                : absError / Math.Abs(exp);

            rows.Add(new ComparisonRowDto(key, exp, actual, absError, relError));
        }

        if (rows.Count == 0)
            return (1.0, rows);

        var score = rows.Average(r => Math.Max(0.0, 1.0 - r.RelError));
        return (score, rows);
    }
}
