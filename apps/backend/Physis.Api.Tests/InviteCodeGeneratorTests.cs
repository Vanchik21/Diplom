using Physis.Api.Services;

namespace Physis.Api.Tests;

public class InviteCodeGeneratorTests
{
    [Fact]
    public void Generate_ReturnsExactlyEightCharacters()
    {
        var code = InviteCodeGenerator.Generate();

        Assert.Equal(8, code.Length);
    }

    [Fact]
    public void Generate_UsesOnlyAllowedAlphabet()
    {
        // Run many times because a single call only samples 8 of 32 symbols.
        for (int i = 0; i < 200; i++)
        {
            var code = InviteCodeGenerator.Generate();
            foreach (var ch in code)
                Assert.Contains(ch, InviteCodeGenerator.Alphabet);
        }
    }

    [Fact]
    public void Alphabet_ExcludesVisuallyAmbiguousCharacters()
    {
        // These pairs are easy to mistake when reading aloud or off a screen:
        // I/1, O/0, and lowercase l. Confirm none made it into the alphabet.
        Assert.DoesNotContain('I', InviteCodeGenerator.Alphabet);
        Assert.DoesNotContain('O', InviteCodeGenerator.Alphabet);
        Assert.DoesNotContain('0', InviteCodeGenerator.Alphabet);
        Assert.DoesNotContain('1', InviteCodeGenerator.Alphabet);
        Assert.DoesNotContain('l', InviteCodeGenerator.Alphabet);
    }

    [Fact]
    public void Generate_TwoConsecutiveCalls_ProduceDifferentCodes()
    {
        // 32^8 ≈ 1.1 trillion possible codes — two adjacent calls effectively
        // never collide outside of cosmic-ray-bit-flip territory.
        var first  = InviteCodeGenerator.Generate();
        var second = InviteCodeGenerator.Generate();

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void Generate_HighEntropyOnBulkRun()
    {
        // 1000 random codes should produce at least 990 unique values; the
        // birthday-paradox collision probability is negligible here.
        var set = new HashSet<string>();
        for (int i = 0; i < 1000; i++)
            set.Add(InviteCodeGenerator.Generate());

        Assert.True(set.Count >= 990, $"Expected ≥990 unique codes, got {set.Count}");
    }

    [Fact]
    public void Generate_DistributesAcrossAlphabet()
    {
        // After 4000 random characters (500 codes × 8 chars) every symbol
        // from the 32-letter alphabet should have appeared at least once.
        var seen = new HashSet<char>();
        for (int i = 0; i < 500; i++)
            foreach (var ch in InviteCodeGenerator.Generate())
                seen.Add(ch);

        Assert.Equal(InviteCodeGenerator.Alphabet.Length, seen.Count);
    }
}
