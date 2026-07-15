namespace AuditApi.Domain;

public sealed record AuditFilter(
    AuditOperationType? OperationType,
    int? EntityType,
    DateTime? FromUtc,
    DateTime? ToExclusiveUtc,
    string? Search,
    AuditSortDirection SortDirection)
{
    public static AuditFilter Empty { get; } = new(null, null, null, null, null, AuditSortDirection.Descending);

    public bool HasVisibleFilters => OperationType is not null || EntityType is not null || FromUtc is not null || ToExclusiveUtc is not null || !string.IsNullOrWhiteSpace(Search);
}
