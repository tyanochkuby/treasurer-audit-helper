using AuditApi.Domain;
using Dapper;

namespace AuditApi.Infrastructure;

public sealed class SqlAuditRepository(ISqlConnectionFactory connectionFactory) : IAuditRepository
{
    private const string MaterializeScopeSql = """
        SET NOCOUNT ON;

        CREATE TABLE #RelatedDocuments (Id uniqueidentifier NOT NULL PRIMARY KEY);
        INSERT #RelatedDocuments
            SELECT Id
            FROM dbo.DocumentHeader
            WHERE Id = @ContractId AND OrganizationId = @OrganizationId
              AND DocumentType = 1 AND DeletedDate IS NULL;
        INSERT #RelatedDocuments
            SELECT d.Id
            FROM dbo.DocumentHeader d
            WHERE d.ParentId = @ContractId AND d.OrganizationId = @OrganizationId
              AND EXISTS (SELECT 1 FROM #RelatedDocuments r WHERE r.Id = @ContractId)
              AND NOT EXISTS (SELECT 1 FROM #RelatedDocuments r WHERE r.Id = d.Id);

        CREATE TABLE #RelatedInvoices (Id uniqueidentifier NOT NULL PRIMARY KEY);
        INSERT #RelatedInvoices
            SELECT i.Id
            FROM dbo.Invoice i
            WHERE i.OrganizationId = @OrganizationId
              AND i.DocumentId IN (SELECT Id FROM #RelatedDocuments);

        CREATE TABLE #RelatedEntityIds (Id uniqueidentifier NOT NULL PRIMARY KEY);
        INSERT #RelatedEntityIds SELECT Id FROM #RelatedDocuments;
        INSERT #RelatedEntityIds SELECT i.Id FROM #RelatedInvoices i
            WHERE NOT EXISTS (SELECT 1 FROM #RelatedEntityIds r WHERE r.Id = i.Id);

        -- These three tables do not expose OrganizationId. Their parent/document
        -- relationship is scoped through the materialized document/invoice sets,
        -- and #ScopedAudit still requires the audit row's organization to match.
        INSERT #RelatedEntityIds SELECT p.Id FROM dbo.PaymentSchedule p
            WHERE p.DocumentId IN (SELECT Id FROM #RelatedDocuments)
              AND NOT EXISTS (SELECT 1 FROM #RelatedEntityIds r WHERE r.Id = p.Id);
        INSERT #RelatedEntityIds SELECT f.Id FROM dbo.ContractFunding f
            WHERE f.ContractId IN (SELECT Id FROM #RelatedDocuments)
              AND NOT EXISTS (SELECT 1 FROM #RelatedEntityIds r WHERE r.Id = f.Id);
        INSERT #RelatedEntityIds SELECT o.Id FROM dbo.Obligations o
            WHERE o.OrganizationId = @OrganizationId
              AND (o.ParentContractId IN (SELECT Id FROM #RelatedDocuments)
                   OR o.InvoiceId IN (SELECT Id FROM #RelatedInvoices))
              AND NOT EXISTS (SELECT 1 FROM #RelatedEntityIds r WHERE r.Id = o.Id);
        INSERT #RelatedEntityIds SELECT c.Id FROM dbo.ContractChange c
            WHERE c.OrganizationId = @OrganizationId
              AND c.DocumentId IN (SELECT Id FROM #RelatedDocuments)
              AND NOT EXISTS (SELECT 1 FROM #RelatedEntityIds r WHERE r.Id = c.Id);
        INSERT #RelatedEntityIds SELECT d.Id FROM dbo.Disclosure d
            WHERE d.OrganizationId = @OrganizationId
              AND d.DocumentId IN (SELECT Id FROM #RelatedDocuments)
              AND NOT EXISTS (SELECT 1 FROM #RelatedEntityIds r WHERE r.Id = d.Id);
        INSERT #RelatedEntityIds SELECT f.Id FROM dbo.[File] f
            WHERE f.OrganizationId = @OrganizationId
              AND (f.ParentId IN (SELECT Id FROM #RelatedDocuments)
                   OR f.ParentId IN (SELECT Id FROM #RelatedInvoices))
              AND NOT EXISTS (SELECT 1 FROM #RelatedEntityIds r WHERE r.Id = f.Id);
        INSERT #RelatedEntityIds SELECT n.Id FROM dbo.Note n
            WHERE (n.ParentId IN (SELECT Id FROM #RelatedDocuments)
                   OR n.ParentId IN (SELECT Id FROM #RelatedInvoices))
              AND NOT EXISTS (SELECT 1 FROM #RelatedEntityIds r WHERE r.Id = n.Id);

        SELECT a.Id, a.OrganizationId, a.UserId, a.UserEmail, a.Type, a.EntityType,
               a.CreatedDate, a.OldValues, a.NewValues, a.AffectedColumns, a.PrimaryKey,
               a.EntityId, a.ParentId
        INTO #ScopedAudit
        FROM dbo.AuditLog a
        WHERE a.OrganizationId = @OrganizationId
          AND a.Type IN (1, 2, 3)
          AND (a.EntityId IN (SELECT Id FROM #RelatedEntityIds)
               OR a.ParentId IN (SELECT Id FROM #RelatedEntityIds));
        """;

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
        var sql = MaterializeScopeSql + $$"""
            SELECT @ContractId AS RootContractId, Id, OrganizationId, UserId, UserEmail, Type, EntityType,
                   CreatedDate, OldValues, NewValues, AffectedColumns, PrimaryKey, EntityId, ParentId
            FROM #ScopedAudit
            WHERE (@OperationType IS NULL OR Type = @OperationType)
              AND (@EntityType IS NULL OR EntityType = @EntityType)
              AND (@FromUtc IS NULL OR CreatedDate >= @FromUtc)
              AND (@ToExclusiveUtc IS NULL OR CreatedDate < @ToExclusiveUtc)
            ORDER BY CreatedDate {{order}}, Id {{order}};

            SELECT COALESCE(MAX(Id), 0) FROM #ScopedAudit;
            """;

        var parameters = new
        {
            ContractId = contractId,
            OrganizationId = organizationId,
            OperationType = filter.OperationType is null ? null : (int?)filter.OperationType,
            filter.EntityType,
            filter.FromUtc,
            filter.ToExclusiveUtc
        };

        await using var connection = connectionFactory.Create();
        using var results = await connection.QueryMultipleAsync(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken, commandTimeout: 30));
        var rows = (await results.ReadAsync<AuditLogRecord>()).AsList();
        var version = await results.ReadSingleAsync<int>();
        return new(rows, version);
    }

    public async Task<int> GetVersionAsync(Guid contractId, Guid organizationId, CancellationToken cancellationToken)
    {
        var sql = MaterializeScopeSql + "SELECT COALESCE(MAX(Id), 0) FROM #ScopedAudit;";
        await using var connection = connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            sql,
            new { ContractId = contractId, OrganizationId = organizationId },
            cancellationToken: cancellationToken,
            commandTimeout: 30));
    }
}
