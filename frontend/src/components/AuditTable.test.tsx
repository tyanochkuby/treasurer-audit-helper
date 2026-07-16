import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AuditEvent } from '../types'
import { AuditTable } from './AuditTable'

const item: AuditEvent = {
  id: '987', contractId: 'contract', occurredAtUtc: '2026-07-14T08:42:12Z', actorDisplayName: 'anna@example.pl', actorId: 'actor-id', operationType: 'Modified', entityTypeCode: 1, entityType: 'ContractHeaderEntity', entityId: 'entity-id', description: 'Zmieniono wartość',
  changes: [{ fieldName: 'ContractGrossValue', fieldDisplayName: 'Wartość brutto umowy', oldValue: '120000', newValue: '135000' }],
}

describe('AuditTable', () => {
  it('renders grouped old and new values', () => {
    render(<AuditTable items={[item]} filtered={false} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('120000')).toBeInTheDocument()
    expect(screen.getByText('135000')).toBeInTheDocument()
    expect(screen.getByText('Wartość brutto umowy')).toBeInTheDocument()
  })

  it('distinguishes empty history from filtered no-results', () => {
    const { rerender } = render(<AuditTable items={[]} filtered={false} />)
    expect(screen.getByText('Brak historii zmian')).toBeInTheDocument()
    rerender(<AuditTable items={[]} filtered />)
    expect(screen.getByText('Brak wyników dla wybranych filtrów')).toBeInTheDocument()
  })

  it('keeps an event visible when it has no meaningful field differences', () => {
    render(<AuditTable items={[{ ...item, changes: [] }]} filtered={false} />)

    expect(screen.getByText('Brak różnic w zapisanych wartościach')).toBeInTheDocument()
    expect(screen.getByText('ID: 987')).toBeInTheDocument()
  })
})
