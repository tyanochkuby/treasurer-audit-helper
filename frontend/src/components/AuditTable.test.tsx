import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuditEvent } from '../types'
import { AuditTable } from './AuditTable'

const item: AuditEvent = {
  id: '987', contractId: 'contract', occurredAtUtc: '2026-07-14T08:42:12Z', actorDisplayName: 'anna@example.pl', actorId: 'actor-id', operationType: 'Modified', entityTypeCode: 1, entityType: 'ContractHeaderEntity', entityId: 'entity-id', description: 'Zmieniono wartość',
  changes: [{ fieldName: 'ContractGrossValue', fieldDisplayName: 'Wartość brutto umowy', oldValue: '120000', newValue: '135000' }],
}
const contract = { displayName: 'UM123456 — Testowy przedmiot umowy', organizationId: 'e1cd1118-9795-4937-8e94-1822cae3e78f' }

describe('AuditTable', () => {
  it('renders grouped old and new values', () => {
    render(<AuditTable items={[item]} filtered={false} contract={contract} />)
    expect(screen.getByRole('list', { name: 'Historia zmian wybranej umowy' })).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toBeInTheDocument()
    expect(screen.getByText('120000')).toBeInTheDocument()
    expect(screen.getByText('135000')).toBeInTheDocument()
    expect(screen.getByText('120000')).toHaveClass('bg-[#FEF1F1]', 'text-[13px]', 'font-normal', 'line-through')
    expect(screen.getByText('135000')).toHaveClass('bg-[#EDF9F0]', 'text-[15px]', 'font-medium')
    expect(screen.getByText('→')).toHaveClass('text-[#B0B7C3]')
    expect(screen.getByText('Poprzednia wartość:')).toHaveClass('sr-only')
    expect(screen.getByText('Nowa wartość:')).toHaveClass('sr-only')
    expect(screen.getByText('Wartość brutto umowy').parentElement).toHaveClass('bg-slate-50/80', 'md:bg-white')
    expect(screen.getByText('1 pole')).toBeInTheDocument()
    expect(screen.getByText('14 lip 2026')).toHaveClass('text-[15px]', 'font-medium')
    expect(screen.getByText('10:42:12')).toHaveClass('text-[13px]', 'font-normal')
    expect(screen.getByText('Zmieniono')).toHaveClass('border', 'border-[#B5D4F4]', 'bg-[#E6F1FB]', 'text-[#0C447C]', 'font-medium')
  })

  it('distinguishes empty history from filtered no-results', () => {
    const { rerender } = render(<AuditTable items={[]} filtered={false} contract={contract} />)
    expect(screen.getByText('Brak historii zmian')).toBeInTheDocument()
    rerender(<AuditTable items={[]} filtered contract={contract} />)
    expect(screen.getByText('Brak wyników dla wybranych filtrów')).toBeInTheDocument()
  })

  it('keeps an event visible when it has no meaningful field differences', () => {
    render(<AuditTable items={[{ ...item, changes: [] }]} filtered={false} contract={contract} />)

    expect(screen.getByText('#987')).toHaveClass('font-mono', 'text-xs', 'text-[#8A93A3]')
    expect(screen.getByRole('button', { name: 'Kopiuj dane techniczne' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /14 lip 2026/ })).toBeDisabled()
  })

  it('shows only the new value for added fields', () => {
    render(<AuditTable items={[{ ...item, operationType: 'Added', changes: [{ ...item.changes[0], oldValue: null }] }]} filtered={false} contract={contract} />)

    expect(screen.getByText('Nowa wartość:')).toHaveClass('sr-only')
    expect(screen.queryByText('Poprzednia wartość:')).not.toBeInTheDocument()
    expect(screen.queryByText('→')).not.toBeInTheDocument()
    expect(screen.getByText('135000')).toHaveClass('text-[15px]', 'font-medium', 'text-[#1F2937]')
    expect(screen.getByText('135000')).not.toHaveClass('bg-[#EDF9F0]')
    expect(screen.getByText('Dodano')).toHaveClass('border-[#9FE1CB]', 'bg-[#EDF9F0]', 'text-[#085041]')
  })

  it('shows UTC field values in Warsaw time and keeps UTC on hover', () => {
    const timestamp = '2026-07-14T08:42:12Z'
    render(<AuditTable items={[{ ...item, changes: [{ ...item.changes[0], oldValue: null, newValue: timestamp }] }]} filtered={false} contract={contract} />)

    const localValue = screen.getByText('14 lip 2026, 10:42:12')
    expect(localValue).toHaveAttribute('title', '14 lip 2026, 08:42:12 UTC')
  })

  it('preserves the previous value as plain evidence for deleted fields', () => {
    render(<AuditTable items={[{ ...item, operationType: 'Deleted', changes: [{ ...item.changes[0], newValue: null }] }]} filtered={false} contract={contract} />)

    expect(screen.getByText('120000')).toHaveClass('text-[15px]', 'font-medium', 'text-[#1F2937]')
    expect(screen.getByText('Poprzednia wartość:')).toHaveClass('sr-only')
    expect(screen.queryByText('→')).not.toBeInTheDocument()
    expect(screen.getByText('Usunięto')).toHaveClass('border-[#F5C4B3]', 'bg-[#FEF1F1]', 'text-[#712B13]')
  })

  it('hides technical identifiers and copies them from the header action', async () => {
    const user = userEvent.setup()
    render(<AuditTable items={[{ ...item, entityTypeCode: 9, entityType: 'Unknown (9)' }]} filtered={false} contract={contract} />)

    expect(screen.getByText('Typ 9')).toBeInTheDocument()
    expect(screen.queryByText('entity-id')).not.toBeInTheDocument()
    expect(screen.queryByText('actor-id')).not.toBeInTheDocument()
    expect(screen.getByText('anna@example.pl')).toHaveAttribute('title', 'actor-id')

    await user.click(screen.getByRole('button', { name: 'Kopiuj dane techniczne' }))

    expect(await navigator.clipboard.readText()).toBe('Contract: UM123456 — Testowy przedmiot umowy\nOrganizationId: e1cd1118-9795-4937-8e94-1822cae3e78f\nAuditLog.Id: 987\nEntityId: entity-id\nUserId: actor-id')
    expect(screen.getByRole('button', { name: 'Skopiowano dane techniczne' })).toBeInTheDocument()
  })

  it('uses the numeric entity type when its name and code disagree', () => {
    render(<AuditTable items={[{ ...item, entityTypeCode: 3, entityType: 'Unknown' }]} filtered={false} contract={contract} />)

    expect(screen.getByText('Typ 3')).toBeInTheDocument()
  })

  it('uses frontend field translations with entity-specific labels and a raw fallback', () => {
    render(<AuditTable items={[{
      ...item,
      entityTypeCode: 5,
      entityType: 'InvoiceEntity',
      changes: [
        { fieldName: 'Number', fieldDisplayName: 'Number', oldValue: '1', newValue: '2' },
        { fieldName: 'P4', fieldDisplayName: 'P4', oldValue: 'A', newValue: 'B' },
      ],
    }]} filtered={false} contract={contract} />)

    expect(screen.getByText('Numer faktury')).toBeInTheDocument()
    expect(screen.getByText('Number')).toBeInTheDocument()
    expect(screen.getByText('P4')).toBeInTheDocument()
  })

  it('keeps the API label as a compatibility fallback', () => {
    render(<AuditTable items={[{
      ...item,
      changes: [{ fieldName: 'futureField', fieldDisplayName: 'Przyszłe pole', oldValue: '1', newValue: '2' }],
    }]} filtered={false} contract={contract} />)

    expect(screen.getByText('Przyszłe pole')).toBeInTheDocument()
    expect(screen.getByText('futureField')).toBeInTheDocument()
  })

  it('announces clipboard failures', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))
    render(<AuditTable items={[item]} filtered={false} contract={contract} />)

    await user.click(screen.getByRole('button', { name: 'Kopiuj dane techniczne' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Nie udało się skopiować danych technicznych')
  })

  it('omits a missing entity identifier from copied technical data', async () => {
    const user = userEvent.setup()
    render(<AuditTable items={[{ ...item, entityId: null }]} filtered={false} contract={contract} />)

    await user.click(screen.getByRole('button', { name: 'Kopiuj dane techniczne' }))

    expect(await navigator.clipboard.readText()).toBe('Contract: UM123456 — Testowy przedmiot umowy\nOrganizationId: e1cd1118-9795-4937-8e94-1822cae3e78f\nAuditLog.Id: 987\nUserId: actor-id')
  })

  it('restarts copy feedback after another click', async () => {
    vi.useFakeTimers()
    try {
      vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
      render(<AuditTable items={[item]} filtered={false} contract={contract} />)
      const copy = screen.getByRole('button', { name: 'Kopiuj dane techniczne' })

      await act(async () => { fireEvent.click(copy) })
      act(() => vi.advanceTimersByTime(1_500))
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Skopiowano dane techniczne' })) })
      act(() => vi.advanceTimersByTime(1_500))

      expect(screen.getByRole('status')).toHaveTextContent('Skopiowano dane techniczne')
      expect(screen.getByRole('button', { name: 'Skopiowano dane techniczne' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('exposes the collapsed state and toggles from the header without treating copy as a toggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<AuditTable items={[item]} filtered={false} contract={contract} expandedIds={new Set()} onToggle={onToggle} />)

    const header = screen.getByRole('button', { name: /14 lip 2026/ })
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(header).toHaveAttribute('aria-controls', 'audit-event-987-body')
    expect(document.getElementById('audit-event-987-body')).toHaveAttribute('aria-hidden', 'true')

    await user.click(header)
    expect(onToggle).toHaveBeenCalledWith('987', true)

    await user.click(screen.getByRole('button', { name: 'Kopiuj dane techniczne' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('summarizes changed field labels without cutting a field name', () => {
    render(<AuditTable items={[{
      ...item,
      changes: [
        item.changes[0],
        { fieldName: 'PublicationDate', fieldDisplayName: 'Data publikacji', oldValue: '1', newValue: '2' },
        { fieldName: 'SentData', fieldDisplayName: 'Wysłane dane', oldValue: '1', newValue: '2' },
      ],
    }]} filtered={false} contract={contract} expandedIds={new Set()} />)

    expect(screen.getByTestId('changed-fields-summary')).toHaveTextContent('Wartość brutto umowy, Data publikacji +1')
  })
})
