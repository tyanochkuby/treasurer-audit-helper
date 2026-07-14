namespace AuditApi.Infrastructure;

public sealed class AppSettings
{
    public AppSettings()
        : this(
            Environment.GetEnvironmentVariable("REKRUTACJA_DB"),
            Environment.GetEnvironmentVariable("ACCESS_CODE"),
            Environment.GetEnvironmentVariable("SESSION_SIGNING_KEY"),
            Environment.GetEnvironmentVariable("COOKIE_SECURE"))
    {
    }

    public AppSettings(string? connectionString, string? accessCode, string? sessionSigningKey, string? cookieSecure)
    {
        ConnectionString = Require(connectionString, "REKRUTACJA_DB");
        AccessCode = Require(accessCode, "ACCESS_CODE");
        SessionSigningKey = Require(sessionSigningKey, "SESSION_SIGNING_KEY");
        if (SessionSigningKey.Length < 32)
        {
            throw new InvalidOperationException("SESSION_SIGNING_KEY must contain at least 32 characters.");
        }

        CookieSecure = !string.Equals(cookieSecure, "false", StringComparison.OrdinalIgnoreCase);
    }

    public string ConnectionString { get; }
    public string AccessCode { get; }
    public string SessionSigningKey { get; }
    public bool CookieSecure { get; }
    public TimeSpan SessionLifetime { get; } = TimeSpan.FromMinutes(30);

    private static string Require(string? value, string name) =>
        string.IsNullOrWhiteSpace(value)
            ? throw new InvalidOperationException($"Missing required server setting: {name}.")
            : value;
}
