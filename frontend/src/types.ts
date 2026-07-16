export interface Contract {
  id: string
  organizationId: string
  displayName: string
  auditEventCount: number
}

export interface AuditChange {
  fieldName: string | null
  fieldDisplayName: string | null
  oldValue: string | null
  newValue: string | null
}

export interface AuditEvent {
  id: string
  contractId: string
  occurredAtUtc: string
  actorDisplayName: string
  actorId: string
  operationType: string
  entityTypeCode: number
  entityType: string
  entityId: string | null
  description: string | null
  changes: AuditChange[]
}

export interface AuditHistory {
  contractId: string
  generatedAtUtc: string
  version: string
  items: AuditEvent[]
}

export interface AuditVersion { version: string }

export interface AuditFilters {
  operationType: string
  entityType: string
  from: string
  to: string
  search: string
  sort: 'asc' | 'desc'
}
