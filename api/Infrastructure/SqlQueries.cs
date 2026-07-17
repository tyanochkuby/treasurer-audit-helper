namespace AuditApi.Infrastructure;

internal static class SqlQueries
{
    public static string MaterializeRelatedEntityIds { get; } = Read("MaterializeRelatedEntityIds.sql");
    public static string MaterializeAuditScope { get; } = MaterializeRelatedEntityIds + "\n" + Read("MaterializeAuditScope.sql");
    public static string GetContractAuditCounts { get; } = Read("GetContractAuditCounts.sql");

    private static string Read(string fileName)
    {
        var resourceName = $"AuditApi.Infrastructure.Sql.{fileName}";
        using var stream = typeof(SqlQueries).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"Embedded SQL resource '{resourceName}' was not found.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
