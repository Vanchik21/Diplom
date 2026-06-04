using Physis.Api.DTOs;
using Physis.Api.Services;

namespace Physis.Api.Tests;

public class GradingServiceTests
{
    // ─── Grade (POE / Scenario) ───────────────────────────────────────────

    [Fact]
    public void Grade_PerfectPrediction_ReturnsOne()
    {
        var expected = new Dictionary<string, double> { ["period"] = 2.0 };
        var observed = new Dictionary<string, double> { ["period"] = 2.0 };

        var (score, rows) = GradingService.Grade(expected, observed);

        Assert.Equal(1.0, score, 3);
        Assert.Single(rows);
        Assert.Equal(0.0, rows[0].RelError, 3);
    }

    [Fact]
    public void Grade_FiftyPercentError_ReturnsHalf()
    {
        var expected = new Dictionary<string, double> { ["period"] = 2.0 };
        var observed = new Dictionary<string, double> { ["period"] = 3.0 };

        var (score, _) = GradingService.Grade(expected, observed);

        Assert.Equal(0.5, score, 3);
    }

    [Fact]
    public void Grade_ErrorAbove100Percent_ClipsToZero()
    {
        var expected = new Dictionary<string, double> { ["period"] = 2.0 };
        var observed = new Dictionary<string, double> { ["period"] = 5.0 };

        var (score, _) = GradingService.Grade(expected, observed);

        Assert.Equal(0.0, score);
    }

    [Fact]
    public void Grade_ZeroExpectedZeroObserved_ReturnsOne()
    {
        var expected = new Dictionary<string, double> { ["x"] = 0.0 };
        var observed = new Dictionary<string, double> { ["x"] = 0.0 };

        var (score, rows) = GradingService.Grade(expected, observed);

        Assert.Equal(1.0, score);
        Assert.Equal(0.0, rows[0].RelError);
    }

    [Fact]
    public void Grade_ZeroExpectedNonZeroObserved_ReturnsZero()
    {
        var expected = new Dictionary<string, double> { ["x"] = 0.0 };
        var observed = new Dictionary<string, double> { ["x"] = 1.0 };

        var (score, rows) = GradingService.Grade(expected, observed);

        Assert.Equal(0.0, score);
        Assert.Equal(1.0, rows[0].RelError);
    }

    [Fact]
    public void Grade_MultipleMetrics_AveragesPartialScores()
    {
        var expected = new Dictionary<string, double> { ["period"] = 2.0, ["maxSpeed"] = 4.0 };
        var observed = new Dictionary<string, double> { ["period"] = 2.0, ["maxSpeed"] = 6.0 };

        var (score, _) = GradingService.Grade(expected, observed);

        Assert.Equal(0.75, score, 3);
    }

    [Fact]
    public void Grade_EmptyExpected_ReturnsOne()
    {
        var (score, rows) = GradingService.Grade(
            new Dictionary<string, double>(),
            new Dictionary<string, double> { ["x"] = 42 });

        Assert.Equal(1.0, score);
        Assert.Empty(rows);
    }

    [Fact]
    public void Grade_MissingObservedKey_SkipsMetricWithoutPenalty()
    {
        var expected = new Dictionary<string, double> { ["period"] = 2.0, ["maxSpeed"] = 4.0 };
        var observed = new Dictionary<string, double> { ["period"] = 2.0 };

        var (score, rows) = GradingService.Grade(expected, observed);

        Assert.Single(rows);
        Assert.Equal(1.0, score);
    }

    [Fact]
    public void Grade_SmallNegativeRelError_BoundedAtZero()
    {
        // Negative differences must still produce non-negative score, never below 0.
        var expected = new Dictionary<string, double> { ["x"] = 1.0 };
        var observed = new Dictionary<string, double> { ["x"] = 100.0 };

        var (score, _) = GradingService.Grade(expected, observed);

        Assert.Equal(0.0, score);
    }

    // ─── GradeProblem (numeric tasks with tolerance) ──────────────────────

    [Fact]
    public void GradeProblem_WithinTolerance_ReturnsOne()
    {
        var fields = new List<AnswerFieldDto>
        {
            new("v", "м/с", CorrectValue: 1.0, Tolerance: 0.1),
        };
        var answers = new Dictionary<string, double> { ["v"] = 1.05 };

        var (score, _) = GradingService.GradeProblem(fields, answers);

        Assert.Equal(1.0, score);
    }

    [Fact]
    public void GradeProblem_OutsideTolerance_ReturnsZero()
    {
        var fields = new List<AnswerFieldDto>
        {
            new("v", "м/с", CorrectValue: 1.0, Tolerance: 0.1),
        };
        var answers = new Dictionary<string, double> { ["v"] = 1.5 };

        var (score, _) = GradingService.GradeProblem(fields, answers);

        Assert.Equal(0.0, score);
    }

    [Fact]
    public void GradeProblem_ExactlyAtTolerance_Counted()
    {
        // Boundary case: |answer - correct| == tolerance is accepted (≤).
        // Using values with exact IEEE 754 representation so the diff is
        // numerically equal to the tolerance, not slightly above.
        var fields = new List<AnswerFieldDto>
        {
            new("v", "м/с", CorrectValue: 1.0, Tolerance: 0.5),
        };
        var answers = new Dictionary<string, double> { ["v"] = 1.5 };

        var (score, _) = GradingService.GradeProblem(fields, answers);

        Assert.Equal(1.0, score);
    }

    [Fact]
    public void GradeProblem_PartiallyCorrect_ReturnsRatio()
    {
        var fields = new List<AnswerFieldDto>
        {
            new("a", "м/с²", CorrectValue: 9.81, Tolerance: 0.5),
            new("v", "м/с",  CorrectValue: 5.0,  Tolerance: 0.1),
        };
        var answers = new Dictionary<string, double>
        {
            ["a"] = 9.7,   // within tolerance
            ["v"] = 7.0,   // outside tolerance
        };

        var (score, _) = GradingService.GradeProblem(fields, answers);

        Assert.Equal(0.5, score, 3);
    }

    [Fact]
    public void GradeProblem_MissingAnswer_Penalises()
    {
        var fields = new List<AnswerFieldDto>
        {
            new("a", "м/с²", CorrectValue: 9.81, Tolerance: 0.5),
            new("v", "м/с",  CorrectValue: 5.0,  Tolerance: 0.1),
        };
        // Only answers one of two fields.
        var answers = new Dictionary<string, double> { ["a"] = 9.81 };

        var (score, _) = GradingService.GradeProblem(fields, answers);

        Assert.Equal(0.5, score, 3);
    }

    [Fact]
    public void GradeProblem_EmptyFields_ReturnsOne()
    {
        var (score, rows) = GradingService.GradeProblem(
            new List<AnswerFieldDto>(),
            new Dictionary<string, double> { ["x"] = 1.0 });

        Assert.Equal(1.0, score);
        Assert.Empty(rows);
    }

    // ─── DeserializeAnswerFields ──────────────────────────────────────────

    [Fact]
    public void DeserializeAnswerFields_NullOrEmpty_ReturnsNull()
    {
        Assert.Null(GradingService.DeserializeAnswerFields(null));
        Assert.Null(GradingService.DeserializeAnswerFields(""));
        Assert.Null(GradingService.DeserializeAnswerFields("   "));
    }

    [Fact]
    public void DeserializeAnswerFields_ValidJson_ReturnsList()
    {
        const string json = """
        [{"Label":"v","Unit":"м/с","CorrectValue":1.0,"Tolerance":0.1}]
        """;

        var result = GradingService.DeserializeAnswerFields(json);

        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("v", result[0].Label);
        Assert.Equal(1.0, result[0].CorrectValue);
        Assert.Equal(0.1, result[0].Tolerance);
    }
}
