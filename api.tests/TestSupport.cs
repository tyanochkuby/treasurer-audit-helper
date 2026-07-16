using AuditApi.Domain;
using AuditApi.Infrastructure;

namespace AuditApi.Tests;

internal sealed class FakeAuditRepository : IAuditRepository
{
    public List<ContractRecord> Contracts { get; } = [];
    public List<AuditLogRecord> AuditRows { get; } = [];
    public int Version { get; set; } = 99;
    public int SnapshotCallCount { get; private set; }
    public int VersionCallCount { get; private set; }

    public Task<IReadOnlyList<ContractRecord>> GetContractsAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<ContractRecord>>(Contracts);

    public Task<IReadOnlyList<ContractAuditCountRecord>> GetContractAuditCountsAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IReadOnlyList<ContractAuditCountRecord>>([]);

    public Task<ContractRecord?> GetContractAsync(Guid contractId, CancellationToken cancellationToken) =>
        Task.FromResult(Contracts.SingleOrDefault(contract => contract.Id == contractId));

    public Task<AuditSnapshot> GetAuditSnapshotAsync(
        Guid contractId,
        Guid organizationId,
        AuditFilter filter,
        CancellationToken cancellationToken)
    {
        SnapshotCallCount++;
        var rows = AuditRows
            .Where(row => row.RootContractId == contractId && row.OrganizationId == organizationId)
            .Where(row => row.Type is 1 or 2 or 3)
            .Where(row => filter.OperationType is null || row.Type == (int)filter.OperationType)
            .Where(row => filter.EntityType is null || row.EntityType == filter.EntityType)
            .Where(row => filter.FromUtc is null || row.CreatedDate >= filter.FromUtc)
            .Where(row => filter.ToExclusiveUtc is null || row.CreatedDate < filter.ToExclusiveUtc);
        rows = filter.SortDirection == AuditSortDirection.Ascending
            ? rows.OrderBy(row => row.CreatedDate).ThenBy(row => row.Id)
            : rows.OrderByDescending(row => row.CreatedDate).ThenByDescending(row => row.Id);
        return Task.FromResult(new AuditSnapshot(rows.ToList(), Version));
    }

    public Task<int> GetVersionAsync(Guid contractId, Guid organizationId, CancellationToken cancellationToken)
    {
        VersionCallCount++;
        return Task.FromResult(Version);
    }
}

internal sealed class ManualTimeProvider(DateTimeOffset now) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = now;
    public override DateTimeOffset GetUtcNow() => Now;
}
