import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Contract } from '../types'
import { MainScreen } from './MainScreen'

const contract: Contract = {
  id: '1ecce627-d19b-4a73-b3e3-466b39bb3e25',
  organizationId: 'e1cd1118-9795-4937-8e94-1822cae3e78f',
  displayName: 'UM123456 — Testowy przedmiot umowy',
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
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wyloguj' })).toBeInTheDocument()
    const loading = screen.getByRole('status', { name: 'Ładowanie historii' })
    expect(loading.children).toHaveLength(3)
    expect(loading.querySelector('.bg-brand-navy')).not.toBeInTheDocument()
  })
})
