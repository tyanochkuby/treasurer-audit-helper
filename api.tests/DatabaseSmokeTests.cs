using AuditApi.Domain;
using AuditApi.Infrastructure;
using Dapper;

namespace AuditApi.Tests;

public sealed class DatabaseSmokeTests
{
    [Fact]
    public async Task Repository_queries_the_configured_database_read_only()
    {
        var connectionString = Environment.GetEnvironmentVariable("REKRUTACJA_DB");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return;
        }

        var settings = new AppSettings(
            connectionString,
            "test-access-code",
            "test-session-signing-key-with-at-least-32-characters",
            "false");
        var repository = new SqlAuditRepository(new SqlConnectionFactory(settings));
        await using (var schemaConnection = new SqlConnectionFactory(settings).Create())
        {
            var idType = await schemaConnection.ExecuteScalarAsync<string>("""
                SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'AuditLog' AND COLUMN_NAME = 'Id'
                """);
            var organizationColumns = (await schemaConnection.QueryAsync<string>("""
                SELECT TABLE_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = 'dbo' AND COLUMN_NAME = 'OrganizationId'
                  AND TABLE_NAME IN ('PaymentSchedule', 'ContractFunding', 'Note')
                ORDER BY TABLE_NAME
                """)).ToArray();
            Assert.Equal("int", idType);
            Assert.Empty(organizationColumns);
        }

        var contracts = await repository.GetContractsAsync(CancellationToken.None);
        var contract = Assert.Single(contracts.Take(1));
        var snapshot = await repository.GetAuditSnapshotAsync(contract.Id, contract.OrganizationId, AuditFilter.Empty, CancellationToken.None);
        var version = await repository.GetVersionAsync(contract.Id, contract.OrganizationId, CancellationToken.None);

        Assert.All(snapshot.Rows, row => Assert.Equal(contract.Id, row.RootContractId));
        Assert.Equal(version, snapshot.Version);
        Assert.True(version >= 0);

        if (snapshot.Rows.Count > 0)
        {
            var operation = (AuditOperationType)snapshot.Rows[0].Type;
            var filter = new AuditFilter(operation, null, null, null, null, AuditSortDirection.Ascending);
            var filtered = await repository.GetAuditSnapshotAsync(
                contract.Id,
                contract.OrganizationId,
                filter,
                CancellationToken.None);

            Assert.All(filtered.Rows, row => Assert.Equal((int)operation, row.Type));
            Assert.Equal(version, filtered.Version);
            Assert.Equal(
                filtered.Rows.OrderBy(row => row.CreatedDate).ThenBy(row => row.Id).Select(row => row.Id),
                filtered.Rows.Select(row => row.Id));
        }
    }
}
