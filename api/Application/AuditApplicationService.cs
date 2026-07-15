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

        var rowsTask = repository.GetAuditAsync(contractId, contract.OrganizationId, filter, cancellationToken);
        var versionTask = repository.GetVersionAsync(contractId, contract.OrganizationId, cancellationToken);
        await Task.WhenAll(rowsTask, versionTask);

        // The repository owns contract scoping and structured filters so they are
        // applied before rows leave SQL Server. Free-text search operates on the
        // mapped, human-readable event and therefore remains in the application.
        var events = rowsTask.Result
            .Select(mapper.Map)
            .Where(item => MatchesSearch(item, filter.Search))
            .ToList();

        return new AuditHistoryDto(
            contractId,
            timeProvider.GetUtcNow().UtcDateTime,
            versionTask.Result.ToString(),
            events);
    }

    public async Task<AuditVersionDto> GetVersionAsync(Guid contractId, CancellationToken cancellationToken)
    {
        var contract = await repository.GetContractAsync(contractId, cancellationToken)
            ?? throw new ContractNotFoundException(contractId);
        var version = await repository.GetVersionAsync(contractId, contract.OrganizationId, cancellationToken);
        return new(version.ToString());
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
