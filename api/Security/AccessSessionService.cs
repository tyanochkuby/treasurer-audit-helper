using System.Security.Cryptography;
using System.Text;
using AuditApi.Infrastructure;

namespace AuditApi.Security;

public sealed class AccessSessionService(AppSettings settings, TimeProvider timeProvider)
{
    public const string CookieName = "audit_session";

    public bool TryCreateSession(string? submittedCode, out string token)
    {
        token = string.Empty;
        if (string.IsNullOrEmpty(submittedCode) || submittedCode.Length > 256)
        {
            return false;
        }

        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(settings.AccessCode));
        var submittedHash = SHA256.HashData(Encoding.UTF8.GetBytes(submittedCode));
        if (!CryptographicOperations.FixedTimeEquals(expectedHash, submittedHash))
        {
            return false;
        }

        var expiresAt = timeProvider.GetUtcNow().Add(settings.SessionLifetime).ToUnixTimeSeconds();
        var payload = Base64UrlEncode(Encoding.UTF8.GetBytes($"1|{expiresAt}"));
        var signature = Sign(payload);
        token = $"{payload}.{signature}";
        return true;
    }

    public bool IsAuthenticated(string? cookieHeader)
    {
        var token = ReadCookie(cookieHeader, CookieName);
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var parts = token.Split('.', 2);
        if (parts.Length != 2)
        {
            return false;
        }

        var expectedSignature = Sign(parts[0]);
        var suppliedSignature = Encoding.ASCII.GetBytes(parts[1]);
        var expectedBytes = Encoding.ASCII.GetBytes(expectedSignature);
        if (suppliedSignature.Length != expectedBytes.Length ||
            !CryptographicOperations.FixedTimeEquals(suppliedSignature, expectedBytes))
        {
            return false;
        }

        try
        {
            var payload = Encoding.UTF8.GetString(Base64UrlDecode(parts[0])).Split('|', 2);
            return payload.Length == 2 &&
                   payload[0] == "1" &&
                   long.TryParse(payload[1], out var expiresAt) &&
                   timeProvider.GetUtcNow().ToUnixTimeSeconds() < expiresAt;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public string CreateCookie(string token)
    {
        var secure = settings.CookieSecure ? "; Secure" : string.Empty;
        return $"{CookieName}={token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age={(int)settings.SessionLifetime.TotalSeconds}{secure}";
    }

    public string CreateExpiredCookie()
    {
        var secure = settings.CookieSecure ? "; Secure" : string.Empty;
        return $"{CookieName}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT{secure}";
    }

    private string Sign(string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(settings.SessionSigningKey));
        return Base64UrlEncode(hmac.ComputeHash(Encoding.ASCII.GetBytes(payload)));
    }

    private static string? ReadCookie(string? header, string name)
    {
        if (string.IsNullOrWhiteSpace(header))
        {
            return null;
        }

        foreach (var part in header.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var separator = part.IndexOf('=');
            if (separator > 0 && part[..separator].Equals(name, StringComparison.Ordinal))
            {
                return part[(separator + 1)..];
            }
        }

        return null;
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded += new string('=', (4 - padded.Length % 4) % 4);
        return Convert.FromBase64String(padded);
    }
}
