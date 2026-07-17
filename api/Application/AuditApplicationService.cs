using AuditApi.Domain;
using AuditApi.Infrastructure;
using AuditApi.Models;

namespace AuditApi.Application;

public sealed class ContractNotFoundException(Guid contractId) : Exception($"Contract {contractId} was not found.");

public sealed class AuditApplicationService(
    IAuditRepository repository,
    AuditMapper mapper,
    TimeProvider timeProvider)
{
    public async Task<IReadOnlyList<ContractDto>> GetContractsAsync(CancellationToken cancellationToken)
    {
        var contracts = await repository.GetContractsAsync(cancellationToken);
        return contracts.Select(ToDto).ToList();
    }

    public async Task<ContractDto> GetContractAsync(Guid contractId, CancellationToken cancellationToken)
    {
        var contract = await repository.GetContractAsync(contractId, cancellationToken)
            ?? throw new ContractNotFoundException(contractId);
        return ToDto(contract);
    }

    public async Task<AuditHistoryDto> GetHistoryAsync(Guid contractId, AuditFilter filter, CancellationToken cancellationToken)
    {
        var contract = await repository.GetContractAsync(contractId, cancellationToken)
            ?? throw new ContractNotFoundException(contractId);

        // The repository owns contract scoping, structured filters and paging so
        // they are applied before rows leave SQL Server. Free-text search operates
        // on the mapped, human-readable event and therefore remains in the
        // application — in that mode the full scope is loaded and paged in memory.
        var searchActive = !string.IsNullOrWhiteSpace(filter.Search);
        var snapshot = await repository.GetAuditSnapshotAsync(
            contractId,
            contract.OrganizationId,
            searchActive ? filter with { Offset = 0, Limit = null } : filter,
            cancellationToken);

        var events = snapshot.Rows.Select(mapper.Map).ToList();
        var totalCount = snapshot.TotalCount;
        if (searchActive)
        {
            var matches = events.Where(item => MatchesSearch(item, filter.Search)).ToList();
            totalCount = matches.Count;
            events = matches.Skip(filter.Offset).Take(filter.Limit ?? matches.Count).ToList();
        }

        return new AuditHistoryDto(
            contractId,
            timeProvider.GetUtcNow().UtcDateTime,
            snapshot.Version,
            totalCount,
            events);
    }

    public async Task<AuditVersionDto> GetVersionAsync(Guid contractId, CancellationToken cancellationToken)
    {
        var contract = await repository.GetContractAsync(contractId, cancellationToken)
            ?? throw new ContractNotFoundException(contractId);
        var version = await repository.GetVersionAsync(contractId, contract.OrganizationId, cancellationToken);
        return new(version);
    }

    private static ContractDto ToDto(ContractRecord contract)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(contract.Number))
        {
            parts.Add(contract.Number.Trim());
        }
        if (!string.IsNullOrWhiteSpace(contract.InternalNumber) &&
            !parts.Contains(contract.InternalNumber.Trim(), StringComparer.OrdinalIgnoreCase))
        {
            parts.Add($"({contract.InternalNumber.Trim()})");
        }

        var identifier = parts.Count > 0 ? string.Join(' ', parts) : contract.Id.ToString();
        var displayName = string.IsNullOrWhiteSpace(contract.Subject)
            ? identifier
            : $"{identifier} — {contract.Subject.Trim()}";
        return new(contract.Id, contract.OrganizationId, displayName);
    }

    private static bool MatchesSearch(AuditEventDto item, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return true;
        }

        var term = search.Trim();
        var values = new List<string?>
        {
            item.ActorDisplayName,
            item.ActorId.ToString(),
            item.EntityId?.ToString(),
            item.EntityType,
            item.Description
        };
        values.AddRange(item.Changes.SelectMany(change => new[]
        {
            change.FieldName,
            change.FieldDisplayName,
            change.OldValue,
            change.NewValue
        }));

        return values.Any(value => value?.Contains(term, StringComparison.OrdinalIgnoreCase) == true);
    }
}
