import type { AuditFilters, AuditHistory, AuditVersion, Contract, ContractAuditCount } from './types'
import i18n from './i18n'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) {
    let message: string = i18n.t('api.genericError')
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) message = payload.message
    } catch { /* Keep the generic client-safe message. */ }
    throw new ApiError(response.status, message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function buildAuditQuery(filters: AuditFilters): string {
  const query = new URLSearchParams()
  if (filters.operationType) query.set('operationType', filters.operationType)
  if (filters.entityType) query.set('entityType', filters.entityType)
  if (filters.from) query.set('from', filters.from)
  if (filters.to) query.set('to', filters.to)
  if (filters.search.trim()) query.set('search', filters.search.trim())
  if (filters.sort === 'asc') query.set('sort', 'asc')
  return query.toString()
}

export const api = {
  access: (code: string) => request<void>('/api/access', { method: 'POST', body: JSON.stringify({ code }) }),
  logout: () => request<void>('/api/logout', { method: 'POST' }),
  contracts: () => request<Contract[]>('/api/contracts'),
  contractAuditCounts: () => request<ContractAuditCount[]>('/api/contracts/audit-counts'),
  audit: (contractId: string, filters: AuditFilters, limit?: number) => {
    const query = new URLSearchParams(buildAuditQuery(filters))
    if (limit) query.set('limit', String(limit))
    const suffix = query.toString()
    return request<AuditHistory>(`/api/contracts/${encodeURIComponent(contractId)}/audit${suffix ? `?${suffix}` : ''}`)
  },
  version: (contractId: string) => request<AuditVersion>(`/api/contracts/${encodeURIComponent(contractId)}/audit/version`),
  export: async (contractId: string, filters: AuditFilters) => {
    const query = buildAuditQuery(filters)
    const response = await fetch(`/api/contracts/${encodeURIComponent(contractId)}/audit/export.csv${query ? `?${query}` : ''}`, { credentials: 'same-origin' })
    if (!response.ok) throw new ApiError(response.status, i18n.t('api.exportError'))
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? 'historia-zmian.csv'
    return { blob: await response.blob(), fileName }
  },
}
