using AuditApi.Domain;

namespace AuditApi.Models;

public sealed record AccessRequest(string? Code);

public sealed record ApiError(string Message);

public sealed record ContractDto(Guid Id, Guid OrganizationId, string DisplayName);

public sealed record ContractAuditCountDto(Guid ContractId, int AuditEventCount);

public sealed record AuditChangeDto(
    string? FieldName,
    string? FieldDisplayName,
    string? OldValue,
    string? NewValue);

public sealed record AuditEventDto(
    string Id,
    Guid ContractId,
    DateTime OccurredAtUtc,
    string ActorDisplayName,
    Guid ActorId,
    string OperationType,
    int EntityTypeCode,
    string EntityType,
    Guid? EntityId,
    string? Description,
    IReadOnlyList<AuditChangeDto> Changes);

public sealed record AuditHistoryDto(
    Guid ContractId,
    DateTime GeneratedAtUtc,
    int Version,
    IReadOnlyList<AuditEventDto> Items);

public sealed record AuditVersionDto(int Version);

public sealed record CsvExport(byte[] Content, string FileName);

public sealed record FilterParseResult(AuditFilter? Filter, string? Error)
{
    public bool IsValid => Filter is not null;
}
