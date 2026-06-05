using System.Security.Cryptography;

namespace Physis.Api.Services;

/// <summary>
/// Generates 8-character classroom invite codes from a 32-symbol alphabet
/// without visually ambiguous characters (no I/O/0/1).
/// </summary>
public static class InviteCodeGenerator
{
    public const string Alphabet  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    public const int    CodeLength = 8;

    public static string Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(CodeLength);
        var chars = new char[CodeLength];
        for (int i = 0; i < CodeLength; i++)
            chars[i] = Alphabet[bytes[i] % Alphabet.Length];
        return new string(chars);
    }
}
