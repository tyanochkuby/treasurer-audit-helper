import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, buildAuditQuery } from './api'
import type { AuditFilters } from './types'

const filters: AuditFilters = { operationType: 'Modified', entityType: '5', from: '2026-07-01', to: '2026-07-14', search: 'wartość', sort: 'asc' }

describe('audit API URL state', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends all selected filters to the history endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ contractId: 'abc', generatedAtUtc: '2026-07-14T10:00:00Z', version: 1, items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await api.audit('abc', filters)
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toBe(`/api/contracts/abc/audit?${buildAuditQuery(filters)}`)
    expect(url).toContain('operationType=Modified')
    expect(url).toContain('search=warto%C5%9B%C4%87')
  })

  it('exports the current contract with the same filters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('csv', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="contract-abc-audit.csv"' } }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await api.export('abc', filters)
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/contracts/abc/audit/export.csv?${buildAuditQuery(filters)}`)
    expect(result.fileName).toBe('contract-abc-audit.csv')
  })
})
