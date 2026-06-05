using Physis.Api.Services;

namespace Physis.Api.Tests;

public class TokenServiceTests
{
    // GenerateRefreshToken does not touch IConfiguration or UserManager, so we
    // can construct the service with null dependencies for this test fixture.
    private static readonly TokenService Service = new(null!, null!);

    [Fact]
    public void GenerateRefreshToken_ReturnsNonEmpty()
    {
        var token = Service.GenerateRefreshToken();

        Assert.False(string.IsNullOrWhiteSpace(token));
    }

    [Fact]
    public void GenerateRefreshToken_IsValidBase64()
    {
        var token = Service.GenerateRefreshToken();

        // Convert.FromBase64String throws FormatException on invalid input.
        var bytes = Convert.FromBase64String(token);
        Assert.NotEmpty(bytes);
    }

    [Fact]
    public void GenerateRefreshToken_Decodes64Bytes()
    {
        // 64 random bytes → ceil(64/3)·4 = 88 base64 characters.
        var token = Service.GenerateRefreshToken();
        var bytes = Convert.FromBase64String(token);

        Assert.Equal(64, bytes.Length);
        Assert.Equal(88, token.Length);
    }

    [Fact]
    public void GenerateRefreshToken_OneThousandCallsAreAllUnique()
    {
        // 64 bytes = 512 bits of entropy from a cryptographic RNG.
        // A duplicate across 1000 samples would indicate the RNG is broken.
        var set = new HashSet<string>();
        for (int i = 0; i < 1000; i++)
            set.Add(Service.GenerateRefreshToken());

        Assert.Equal(1000, set.Count);
    }
}
