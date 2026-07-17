using AuditApi.Domain;
using Dapper;

namespace AuditApi.Infrastructure;

public sealed class SqlAuditRepository(ISqlConnectionFactory connectionFactory) : IAuditRepository
{
    public async Task<IReadOnlyList<ContractRecord>> GetContractsAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT Id, OrganizationId, Number, InternalNumber, Subject
            FROM dbo.DocumentHeader
            WHERE DocumentType = 1 AND DeletedDate IS NULL
            ORDER BY COALESCE(NULLIF(Number, ''), NULLIF(InternalNumber, ''), NULLIF(Subject, '')), Id;
            """;

        await using var connection = connectionFactory.Create();
        var rows = await connection.QueryAsync<ContractRecord>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<ContractAuditCountRecord>> GetContractAuditCountsAsync(CancellationToken cancellationToken)
    {
        await using var connection = connectionFactory.Create();
        var rows = await connection.QueryAsync<ContractAuditCountRecord>(new CommandDefinition(
            SqlQueries.GetContractAuditCounts,
            cancellationToken: cancellationToken,
            commandTimeout: 30));
        return rows.AsList();
    }

    public async Task<ContractRecord?> GetContractAsync(Guid contractId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT Id, OrganizationId, Number, InternalNumber, Subject
            FROM dbo.DocumentHeader
            WHERE Id = @ContractId AND DocumentType = 1 AND DeletedDate IS NULL;
            """;

        await using var connection = connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<ContractRecord>(
            new CommandDefinition(sql, new { ContractId = contractId }, cancellationToken: cancellationToken));
    }

    public async Task<AuditSnapshot> GetAuditSnapshotAsync(
        Guid contractId,
        Guid organizationId,
        AuditFilter filter,
        CancellationToken cancellationToken)
    {
        var order = filter.SortDirection == AuditSortDirection.Ascending ? "ASC" : "DESC";
        var paging = filter.Limit is null ? string.Empty : " OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY";
        var sql = SqlQueries.MaterializeAuditScope + $$"""
            SELECT @ContractId AS RootContractId, Id, OrganizationId, UserId, UserEmail, Type, EntityType,
                   CreatedDate, OldValues, NewValues, AffectedColumns, PrimaryKey, EntityId, ParentId
            FROM #ScopedAudit
            WHERE (@OperationType IS NULL OR Type = @OperationType)
              AND (@EntityType IS NULL OR EntityType = @EntityType)
              AND (@FromUtc IS NULL OR CreatedDate >= @FromUtc)
              AND (@ToExclusiveUtc IS NULL OR CreatedDate < @ToExclusiveUtc)
            ORDER BY CreatedDate {{order}}, Id {{order}}{{paging}};

            SELECT COUNT(*)
            FROM #ScopedAudit
            WHERE (@OperationType IS NULL OR Type = @OperationType)
              AND (@EntityType IS NULL OR EntityType = @EntityType)
              AND (@FromUtc IS NULL OR CreatedDate >= @FromUtc)
              AND (@ToExclusiveUtc IS NULL OR CreatedDate < @ToExclusiveUtc);

            SELECT COALESCE(MAX(Id), 0) FROM #ScopedAudit;
            """;

        var parameters = new
        {
            ContractId = contractId,
            OrganizationId = organizationId,
            OperationType = filter.OperationType is null ? null : (int?)filter.OperationType,
            filter.EntityType,
            filter.FromUtc,
            filter.ToExclusiveUtc,
            filter.Offset,
            filter.Limit
        };

        await using var connection = connectionFactory.Create();
        using var results = await connection.QueryMultipleAsync(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken, commandTimeout: 30));
        var rows = (await results.ReadAsync<AuditLogRecord>()).AsList();
        var totalCount = await results.ReadSingleAsync<int>();
        var version = await results.ReadSingleAsync<int>();
        return new(rows, totalCount, version);
    }

    public async Task<int> GetVersionAsync(Guid contractId, Guid organizationId, CancellationToken cancellationToken)
    {
        var sql = SqlQueries.MaterializeAuditScope + "SELECT COALESCE(MAX(Id), 0) FROM #ScopedAudit;";
        await using var connection = connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            sql,
            new { ContractId = contractId, OrganizationId = organizationId },
            cancellationToken: cancellationToken,
            commandTimeout: 30));
    }
}
