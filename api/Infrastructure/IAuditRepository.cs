using AuditApi.Domain;

namespace AuditApi.Infrastructure;

public sealed record ContractRecord(Guid Id, Guid OrganizationId, string? Number, string? InternalNumber, string? Subject);

public sealed record ContractAuditCountRecord(Guid ContractId, int AuditEventCount);

public sealed record AuditLogRecord(
    Guid RootContractId,
    int Id,
    Guid OrganizationId,
    Guid UserId,
    string UserEmail,
    int Type,
    int EntityType,
    DateTime CreatedDate,
    string? OldValues,
    string? NewValues,
    string? AffectedColumns,
    string? PrimaryKey,
    Guid? EntityId,
    Guid? ParentId);

public sealed record AuditSnapshot(IReadOnlyList<AuditLogRecord> Rows, int TotalCount, int Version);

public interface IAuditRepository
{
    Task<IReadOnlyList<ContractRecord>> GetContractsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<ContractAuditCountRecord>> GetContractAuditCountsAsync(CancellationToken cancellationToken);
    Task<ContractRecord?> GetContractAsync(Guid contractId, CancellationToken cancellationToken);
    Task<AuditSnapshot> GetAuditSnapshotAsync(Guid contractId, Guid organizationId, AuditFilter filter, CancellationToken cancellationToken);
    Task<int> GetVersionAsync(Guid contractId, Guid organizationId, CancellationToken cancellationToken);
}
