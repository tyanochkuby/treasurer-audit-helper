using Microsoft.Data.SqlClient;

namespace AuditApi.Infrastructure;

public interface ISqlConnectionFactory
{
    SqlConnection Create();
}

public sealed class SqlConnectionFactory(AppSettings settings) : ISqlConnectionFactory
{
    private readonly string _connectionString = Normalize(settings.ConnectionString);

    public SqlConnection Create() => new(_connectionString);

    internal static string Normalize(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || !uri.Scheme.Equals("sqlserver", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var userInfo = uri.UserInfo.Split(':', 2);
        if (userInfo.Length != 2)
        {
            throw new InvalidOperationException("The SQL Server URL must contain a username and password.");
        }

        var database = ParseQuery(uri.Query).GetValueOrDefault("database");
        if (string.IsNullOrWhiteSpace(database))
        {
            throw new InvalidOperationException("The SQL Server URL must contain a database query parameter.");
        }

        var builder = new SqlConnectionStringBuilder
        {
            DataSource = uri.IsDefaultPort ? uri.Host : $"{uri.Host},{uri.Port}",
            InitialCatalog = database,
            UserID = Uri.UnescapeDataString(userInfo[0]),
            Password = Uri.UnescapeDataString(userInfo[1]),
            Encrypt = true,
            TrustServerCertificate = false
        };

        return builder.ConnectionString;
    }

    private static Dictionary<string, string> ParseQuery(string query) =>
        query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Where(parts => parts.Length == 2)
            .ToDictionary(
                parts => Uri.UnescapeDataString(parts[0]),
                parts => Uri.UnescapeDataString(parts[1]),
                StringComparer.OrdinalIgnoreCase);
}
