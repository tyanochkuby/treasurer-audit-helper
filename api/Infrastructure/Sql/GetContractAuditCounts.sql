SET NOCOUNT ON;

SELECT Id, OrganizationId
INTO #Contracts
FROM dbo.DocumentHeader
WHERE DocumentType = 1 AND DeletedDate IS NULL;
CREATE UNIQUE CLUSTERED INDEX IX_Contracts_Id ON #Contracts (Id);

CREATE TABLE #RelatedDocuments (
    ContractId uniqueidentifier NOT NULL,
    OrganizationId uniqueidentifier NOT NULL,
    Id uniqueidentifier NOT NULL,
    PRIMARY KEY (ContractId, Id)
);
INSERT #RelatedDocuments SELECT Id, OrganizationId, Id FROM #Contracts;
INSERT #RelatedDocuments
    SELECT c.Id, c.OrganizationId, d.Id
    FROM #Contracts c
    JOIN dbo.DocumentHeader d ON d.ParentId = c.Id AND d.OrganizationId = c.OrganizationId;

CREATE TABLE #RelatedInvoices (
    ContractId uniqueidentifier NOT NULL,
    OrganizationId uniqueidentifier NOT NULL,
    Id uniqueidentifier NOT NULL,
    PRIMARY KEY (ContractId, Id)
);
INSERT #RelatedInvoices
    SELECT d.ContractId, d.OrganizationId, i.Id
    FROM #RelatedDocuments d
    JOIN dbo.Invoice i ON i.DocumentId = d.Id AND i.OrganizationId = d.OrganizationId;

CREATE TABLE #ContractEntities (
    ContractId uniqueidentifier NOT NULL,
    OrganizationId uniqueidentifier NOT NULL,
    Id uniqueidentifier NOT NULL,
    PRIMARY KEY (ContractId, Id)
);
INSERT #ContractEntities SELECT ContractId, OrganizationId, Id FROM #RelatedDocuments;
INSERT #ContractEntities SELECT ContractId, OrganizationId, Id FROM #RelatedInvoices;
INSERT #ContractEntities
    SELECT d.ContractId, d.OrganizationId, p.Id
    FROM #RelatedDocuments d JOIN dbo.PaymentSchedule p ON p.DocumentId = d.Id;
INSERT #ContractEntities
    SELECT d.ContractId, d.OrganizationId, f.Id
    FROM #RelatedDocuments d JOIN dbo.ContractFunding f ON f.ContractId = d.Id;
INSERT #ContractEntities
    SELECT ContractId, OrganizationId, Id FROM (
        SELECT d.ContractId, d.OrganizationId, o.Id
        FROM #RelatedDocuments d JOIN dbo.Obligations o ON o.ParentContractId = d.Id AND o.OrganizationId = d.OrganizationId
        UNION
        SELECT i.ContractId, i.OrganizationId, o.Id
        FROM #RelatedInvoices i JOIN dbo.Obligations o ON o.InvoiceId = i.Id AND o.OrganizationId = i.OrganizationId
    ) matched;
INSERT #ContractEntities
    SELECT d.ContractId, d.OrganizationId, c.Id
    FROM #RelatedDocuments d JOIN dbo.ContractChange c ON c.DocumentId = d.Id AND c.OrganizationId = d.OrganizationId;
INSERT #ContractEntities
    SELECT d.ContractId, d.OrganizationId, x.Id
    FROM #RelatedDocuments d JOIN dbo.Disclosure x ON x.DocumentId = d.Id AND x.OrganizationId = d.OrganizationId;
INSERT #ContractEntities
    SELECT ContractId, OrganizationId, Id FROM (
        SELECT d.ContractId, d.OrganizationId, f.Id
        FROM #RelatedDocuments d JOIN dbo.[File] f ON f.ParentId = d.Id AND f.OrganizationId = d.OrganizationId
        UNION
        SELECT i.ContractId, i.OrganizationId, f.Id
        FROM #RelatedInvoices i JOIN dbo.[File] f ON f.ParentId = i.Id AND f.OrganizationId = i.OrganizationId
    ) matched;
INSERT #ContractEntities
    SELECT ContractId, OrganizationId, Id FROM (
        SELECT d.ContractId, d.OrganizationId, n.Id
        FROM #RelatedDocuments d JOIN dbo.Note n ON n.ParentId = d.Id
        UNION
        SELECT i.ContractId, i.OrganizationId, n.Id
        FROM #RelatedInvoices i JOIN dbo.Note n ON n.ParentId = i.Id
    ) matched;

SELECT ContractId, AuditId INTO #ContractAudit
FROM (
    SELECT e.ContractId, a.Id AS AuditId
    FROM #ContractEntities e
    JOIN dbo.AuditLog a ON a.OrganizationId = e.OrganizationId AND a.EntityId = e.Id
    WHERE a.Type IN (1, 2, 3)
    UNION
    SELECT e.ContractId, a.Id
    FROM #ContractEntities e
    JOIN dbo.AuditLog a ON a.OrganizationId = e.OrganizationId AND a.ParentId = e.Id
    WHERE a.Type IN (1, 2, 3)
) matched;

SELECT c.Id AS ContractId, COALESCE(a.AuditEventCount, 0) AS AuditEventCount
FROM #Contracts c
LEFT JOIN (
    SELECT ContractId, COUNT(*) AS AuditEventCount
    FROM #ContractAudit
    GROUP BY ContractId
) a ON a.ContractId = c.Id
ORDER BY c.Id;
