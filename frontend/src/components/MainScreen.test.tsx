import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { AuditEvent, Contract } from '../types'
import { MainScreen } from './MainScreen'

const contract: Contract = {
  id: '1ecce627-d19b-4a73-b3e3-466b39bb3e25',
  organizationId: 'e1cd1118-9795-4937-8e94-1822cae3e78f',
  displayName: 'UM123456 — Testowy przedmiot umowy',
  auditEventCount: 12,
}

describe('MainScreen', () => {
  it('keeps the selected document identity in a sticky header', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/?contractId=${contract.id}`]}>
          <MainScreen contracts={[contract]} onUnauthorized={vi.fn()} onLogout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const heading = screen.getByRole('heading', { name: contract.displayName })
    expect(heading.closest('.sticky')).toHaveClass('top-0')
    expect(heading.closest('.sticky')).toHaveClass('xl:h-[104px]')
    expect(screen.getByText(`Organizacja: ${contract.organizationId}`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zmień umowę' })).toHaveClass('w-10', 'p-0')
    expect(screen.getByRole('button', { name: 'Odśwież' })).toHaveClass('w-10', 'p-0', 'lg:w-auto')
    expect(screen.getByRole('button', { name: 'Eksportuj CSV' })).toHaveClass('w-10', 'p-0', 'lg:w-auto')
    expect(screen.getByText('Odśwież')).toHaveClass('hidden', 'lg:inline')
    expect(screen.getByText('Eksportuj CSV')).toHaveClass('hidden', 'lg:inline')
    expect(screen.getByRole('button', { name: 'Wyloguj' })).toBeInTheDocument()
    const loading = screen.getByRole('status', { name: 'Ładowanie historii' })
    expect(loading.children).toHaveLength(3)
  })

  it('offers one reactive expand/collapse-all control for multi-event histories', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const filters = { operationType: '', entityType: '', from: '', to: '', search: '', sort: 'desc' }
    const items: AuditEvent[] = Array.from({ length: 5 }, (_, index) => ({
      id: String(index + 1),
      contractId: contract.id,
      occurredAtUtc: '2026-07-14T08:42:12Z',
      actorDisplayName: 'anna@example.pl',
      actorId: 'actor-id',
      operationType: 'Modified',
      entityTypeCode: 1,
      entityType: 'ContractHeaderEntity',
      entityId: null,
      description: null,
      changes: [{ fieldName: 'Number', fieldDisplayName: 'Numer', oldValue: '1', newValue: '2' }],
    }))
    queryClient.setQueryData(['audit', contract.id, filters], { contractId: contract.id, generatedAtUtc: '2026-07-14T10:00:00Z', version: 1, items })
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/?contractId=${contract.id}`]}>
          <MainScreen contracts={[contract]} onUnauthorized={vi.fn()} onLogout={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const headers = screen.getAllByRole('button', { expanded: false })
    expect(headers).toHaveLength(4)
    const expandAll = screen.getByRole('button', { name: 'Rozwiń wszystkie' })
    expect(expandAll).toHaveClass('w-10', 'p-0', 'lg:w-auto', 'lg:px-3')
    expect(screen.getByText('Rozwiń wszystkie')).toHaveClass('hidden', 'lg:inline')
    expect(expandAll).toHaveAttribute('title', 'Rozwiń wszystkie')
    expect(expandAll.querySelector('svg')).toBeInTheDocument()
    await user.click(expandAll)
    const collapseAll = screen.getByRole('button', { name: 'Zwiń wszystkie' })
    expect(collapseAll).toHaveAttribute('title', 'Zwiń wszystkie')
    expect(collapseAll.querySelector('svg')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(5)
  })
})
