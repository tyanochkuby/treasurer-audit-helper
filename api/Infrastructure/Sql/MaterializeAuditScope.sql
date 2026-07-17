SELECT a.Id, a.OrganizationId, a.UserId, a.UserEmail, a.Type, a.EntityType,
       a.CreatedDate, a.OldValues, a.NewValues, a.AffectedColumns, a.PrimaryKey,
       a.EntityId, a.ParentId
INTO #ScopedAudit
FROM dbo.AuditLog a
WHERE a.OrganizationId = @OrganizationId
  AND a.Type IN (1, 2, 3)
  AND (a.EntityId IN (SELECT Id FROM #RelatedEntityIds)
       OR a.ParentId IN (SELECT Id FROM #RelatedEntityIds));
