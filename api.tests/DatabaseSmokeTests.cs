using AuditApi.Domain;
using AuditApi.Infrastructure;

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

        var contracts = await repository.GetContractsAsync(CancellationToken.None);
        var contract = Assert.Single(contracts.Take(1));
        var history = await repository.GetAuditAsync(contract.Id, contract.OrganizationId, AuditFilter.Empty, CancellationToken.None);
        var version = await repository.GetVersionAsync(contract.Id, contract.OrganizationId, CancellationToken.None);

        Assert.All(history, row => Assert.Equal(contract.Id, row.RootContractId));
        Assert.True(version >= 0);
    }
}
