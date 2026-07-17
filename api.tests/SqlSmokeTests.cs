using AuditApi.Domain;
using AuditApi.Infrastructure;
using Microsoft.Data.SqlClient;

namespace AuditApi.Tests;

public sealed class DatabaseFactAttribute : FactAttribute
{
    public DatabaseFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("REKRUTACJA_DB")))
        {
            Skip = "REKRUTACJA_DB is not set.";
        }
    }
}

/// <summary>
/// Smoke tests running the embedded SQL against the real database.
/// Run only when REKRUTACJA_DB is set
/// </summary>
public sealed class SqlSmokeTests
{
    private sealed class EnvConnectionFactory : ISqlConnectionFactory
    {
        private readonly string _connectionString =
            SqlConnectionFactory.Normalize(Environment.GetEnvironmentVariable("REKRUTACJA_DB")!);

        public SqlConnection Create() => new(_connectionString);
    }

    private readonly SqlAuditRepository _repository = new(new EnvConnectionFactory());

    [DatabaseFact]
    public async Task Counts_query_covers_the_same_contracts_as_the_contract_list()
    {
        var contracts = await _repository.GetContractsAsync(CancellationToken.None);
        var counts = await _repository.GetContractAuditCountsAsync(CancellationToken.None);

        Assert.NotEmpty(contracts);
        Assert.Equal(
            contracts.Select(c => c.Id).OrderBy(id => id),
            counts.Select(c => c.ContractId).OrderBy(id => id));
    }

    [DatabaseFact]
    public async Task Per_contract_scope_and_version_agree_with_the_counts_query()
    {
        var contracts = await _repository.GetContractsAsync(CancellationToken.None);
        var counts = (await _repository.GetContractAuditCountsAsync(CancellationToken.None))
            .ToDictionary(c => c.ContractId, c => c.AuditEventCount);

        var samples = contracts.OrderByDescending(c => counts[c.Id]).Take(3)
            .Concat(contracts.Where(c => counts[c.Id] == 0).Take(1))
            .ToList();

        foreach (var contract in samples)
        {
            var snapshot = await _repository.GetAuditSnapshotAsync(
                contract.Id, contract.OrganizationId, AuditFilter.Empty, CancellationToken.None);
            var version = await _repository.GetVersionAsync(
                contract.Id, contract.OrganizationId, CancellationToken.None);

            Assert.Equal(counts[contract.Id], snapshot.Rows.Count);
            Assert.Equal(snapshot.Version, version);
        }
    }
}
