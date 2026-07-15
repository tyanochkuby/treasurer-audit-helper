using AuditApi.Domain;
using Dapper;

namespace AuditApi.Infrastructure;

public sealed class SqlAuditRepository(ISqlConnectionFactory connectionFactory) : IAuditRepository
{
    private const string ScopeCte = """
        WITH SelectedContract AS (
            SELECT Id, OrganizationId
            FROM dbo.DocumentHeader
            WHERE Id = @ContractId AND OrganizationId = @OrganizationId
              AND DocumentType = 1 AND DeletedDate IS NULL
        ),
        RelatedDocuments AS (
            SELECT Id FROM SelectedContract
            UNION
            SELECT d.Id
            FROM dbo.DocumentHeader d
            INNER JOIN SelectedContract c ON d.ParentId = c.Id AND d.OrganizationId = c.OrganizationId
        ),
        RelatedInvoices AS (
            SELECT i.Id
            FROM dbo.Invoice i
            INNER JOIN SelectedContract c ON i.OrganizationId = c.OrganizationId
            WHERE i.DocumentId IN (SELECT Id FROM RelatedDocuments)
        ),
        RelatedEntityIds AS (
            SELECT Id FROM RelatedDocuments
            UNION SELECT Id FROM RelatedInvoices
            -- These three tables do not expose OrganizationId. Their parent/document
            -- relationship is scoped through RelatedDocuments/RelatedInvoices, and
            -- ScopedAudit still requires the audit row's OrganizationId to match.
            UNION SELECT p.Id FROM dbo.PaymentSchedule p WHERE p.DocumentId IN (SELECT Id FROM RelatedDocuments)
            UNION SELECT f.Id FROM dbo.ContractFunding f WHERE f.ContractId IN (SELECT Id FROM RelatedDocuments)
            UNION SELECT o.Id FROM dbo.Obligations o INNER JOIN SelectedContract c ON o.OrganizationId = c.OrganizationId
                WHERE o.ParentContractId IN (SELECT Id FROM RelatedDocuments) OR o.InvoiceId IN (SELECT Id FROM RelatedInvoices)
            UNION SELECT cch.Id FROM dbo.ContractChange cch INNER JOIN SelectedContract c ON cch.OrganizationId = c.OrganizationId
                WHERE cch.DocumentId IN (SELECT Id FROM RelatedDocuments)
            UNION SELECT dsc.Id FROM dbo.Disclosure dsc INNER JOIN SelectedContract c ON dsc.OrganizationId = c.OrganizationId
                WHERE dsc.DocumentId IN (SELECT Id FROM RelatedDocuments)
            UNION SELECT f.Id FROM dbo.[File] f INNER JOIN SelectedContract c ON f.OrganizationId = c.OrganizationId
                WHERE f.ParentId IN (SELECT Id FROM RelatedDocuments) OR f.ParentId IN (SELECT Id FROM RelatedInvoices)
            UNION SELECT n.Id FROM dbo.Note n
                WHERE n.ParentId IN (SELECT Id FROM RelatedDocuments) OR n.ParentId IN (SELECT Id FROM RelatedInvoices)
        ),
        ScopedAudit AS (
            SELECT a.*
            FROM dbo.AuditLog a
            INNER JOIN SelectedContract c ON a.OrganizationId = c.OrganizationId
            WHERE a.Type IN (1, 2, 3)
              AND (a.EntityId IN (SELECT Id FROM RelatedEntityIds)
                   OR a.ParentId IN (SELECT Id FROM RelatedEntityIds))
        )
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

    public async Task<IReadOnlyList<AuditLogRecord>> GetAuditAsync(
        Guid contractId,
        Guid organizationId,
        AuditFilter filter,
        CancellationToken cancellationToken)
    {
        var order = filter.SortDirection == AuditSortDirection.Ascending ? "ASC" : "DESC";
        var sql = ScopeCte + $$"""
            SELECT @ContractId AS RootContractId, Id, OrganizationId, UserId, UserEmail, Type, EntityType,
                   CreatedDate, OldValues, NewValues, AffectedColumns, PrimaryKey, EntityId, ParentId
            FROM ScopedAudit
            WHERE (@OperationType IS NULL OR Type = @OperationType)
              AND (@EntityType IS NULL OR EntityType = @EntityType)
              AND (@FromUtc IS NULL OR CreatedDate >= @FromUtc)
              AND (@ToExclusiveUtc IS NULL OR CreatedDate < @ToExclusiveUtc)
            ORDER BY CreatedDate {{order}}, Id {{order}};
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
        var rows = await connection.QueryAsync<AuditLogRecord>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken, commandTimeout: 30));
        return rows.AsList();
    }

    public async Task<int> GetVersionAsync(Guid contractId, Guid organizationId, CancellationToken cancellationToken)
    {
        var sql = ScopeCte + "SELECT COALESCE(MAX(Id), 0) FROM ScopedAudit;";
        await using var connection = connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(
            sql,
            new { ContractId = contractId, OrganizationId = organizationId },
            cancellationToken: cancellationToken,
            commandTimeout: 30));
    }
}
