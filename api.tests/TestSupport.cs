using AuditApi.Domain;
using AuditApi.Infrastructure;

namespace AuditApi.Tests;

internal sealed class FakeAuditRepository : IAuditRepository
{
    public List<ContractRecord> Contracts { get; } = [];
    public List<AuditLogRecord> AuditRows { get; } = [];
    public int Version { get; set; } = 99;

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
        CancellationToken cancellationToken) =>
        Task.FromResult(new AuditSnapshot(AuditRows, Version));

    public Task<int> GetVersionAsync(Guid contractId, Guid organizationId, CancellationToken cancellationToken) =>
        Task.FromResult(Version);
}

internal sealed class ManualTimeProvider(DateTimeOffset now) : TimeProvider
{
    public DateTimeOffset Now { get; set; } = now;
    public override DateTimeOffset GetUtcNow() => Now;
}
