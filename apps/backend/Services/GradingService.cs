using System.Text.Json;
using Physis.Api.DTOs;

namespace Physis.Api.Services;

public static class GradingService
{
    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    /// <summary>Grades POE/Scenario: compares observed vs expected metrics by relative error.</summary>
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

    /// <summary>
    /// Grades Problem type: each answer field is correct if |student - correct| &lt;= tolerance.
    /// Score = correct_count / total_count.
    /// </summary>
    public static (double Score, List<ComparisonRowDto> Rows) GradeProblem(
        List<AnswerFieldDto> fields,
        Dictionary<string, double> studentAnswers)
    {
        if (fields.Count == 0)
            return (1.0, []);

        var rows = new List<ComparisonRowDto>();
        int correct = 0;

        foreach (var field in fields)
        {
            if (!studentAnswers.TryGetValue(field.Label, out var actual))
                continue;

            var absError = Math.Abs(actual - field.CorrectValue);
            var relError = Math.Abs(field.CorrectValue) < 1e-12
                ? (Math.Abs(actual) < 1e-12 ? 0.0 : 1.0)
                : absError / Math.Abs(field.CorrectValue);

            rows.Add(new ComparisonRowDto(field.Label, field.CorrectValue, actual, absError, relError));

            if (absError <= field.Tolerance)
                correct++;
        }

        var score = rows.Count > 0 ? (double)correct / fields.Count : 1.0;
        return (score, rows);
    }

    public static List<AnswerFieldDto>? DeserializeAnswerFields(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        return JsonSerializer.Deserialize<List<AnswerFieldDto>>(json, JsonOpts);
    }
}
