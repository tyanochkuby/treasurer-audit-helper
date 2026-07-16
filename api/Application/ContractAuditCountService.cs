using AuditApi.Infrastructure;
using AuditApi.Models;
using Microsoft.Extensions.Caching.Memory;

namespace AuditApi.Application;

public sealed class ContractAuditCountService(IAuditRepository repository, IMemoryCache cache)
{
    private const string CacheKey = "active-contract-audit-counts";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);
    private readonly SemaphoreSlim refreshGate = new(1, 1);

    public async Task<IReadOnlyList<ContractAuditCountDto>> GetAsync(CancellationToken cancellationToken)
    {
        if (cache.TryGetValue(CacheKey, out IReadOnlyList<ContractAuditCountDto>? cached) && cached is not null)
        {
            return cached;
        }

        await refreshGate.WaitAsync(cancellationToken);
        try
        {
            if (cache.TryGetValue(CacheKey, out cached) && cached is not null)
            {
                return cached;
            }

            var rows = await repository.GetContractAuditCountsAsync(cancellationToken);
            var result = rows
                .Select(row => new ContractAuditCountDto(row.ContractId, row.AuditEventCount))
                .ToList();
            cache.Set(CacheKey, result, CacheDuration);
            return result;
        }
        finally
        {
            refreshGate.Release();
        }
    }
}
