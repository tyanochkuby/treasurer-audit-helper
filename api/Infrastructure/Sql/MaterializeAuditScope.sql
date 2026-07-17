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
