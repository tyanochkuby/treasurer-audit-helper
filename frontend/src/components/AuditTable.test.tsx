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
    expect(screen.getByRole('list', { name: 'Historia zmian wybranej umowy' })).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('120000')).toBeInTheDocument()
    expect(screen.getByText('135000')).toBeInTheDocument()
    expect(screen.getByText('120000')).toHaveClass('bg-[#FEF1F1]', 'text-[13px]', 'font-normal', 'line-through')
    expect(screen.getByText('135000')).toHaveClass('bg-[#EDF9F0]', 'text-[15px]', 'font-medium')
    expect(screen.getByText('→')).toHaveClass('text-[#B0B7C3]')
    expect(screen.getByText('Poprzednia wartość:')).toHaveClass('sr-only')
    expect(screen.getByText('Nowa wartość:')).toHaveClass('sr-only')
    expect(screen.getByText('Wartość brutto umowy')).toBeInTheDocument()
    expect(screen.getByText('1 pole')).toBeInTheDocument()
    expect(screen.queryByText('Zmieniono wartość')).not.toBeInTheDocument()
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

  it('shows only the new value for added fields', () => {
    render(<AuditTable items={[{ ...item, operationType: 'Added', changes: [{ ...item.changes[0], oldValue: null }] }]} filtered={false} />)

    expect(screen.getByText('Nowa wartość:')).toHaveClass('sr-only')
    expect(screen.queryByText('Poprzednia wartość:')).not.toBeInTheDocument()
    expect(screen.queryByText('→')).not.toBeInTheDocument()
    expect(screen.getByText('135000')).toHaveClass('text-[15px]', 'font-medium', 'text-[#1F2937]')
    expect(screen.getByText('135000')).not.toHaveClass('bg-[#EDF9F0]')
  })

  it('preserves the previous value as plain evidence for deleted fields', () => {
    render(<AuditTable items={[{ ...item, operationType: 'Deleted', changes: [{ ...item.changes[0], newValue: null }] }]} filtered={false} />)

    expect(screen.getByText('120000')).toHaveClass('text-[15px]', 'font-medium', 'text-[#1F2937]')
    expect(screen.getByText('Poprzednia wartość:')).toHaveClass('sr-only')
    expect(screen.queryByText('→')).not.toBeInTheDocument()
  })
})
