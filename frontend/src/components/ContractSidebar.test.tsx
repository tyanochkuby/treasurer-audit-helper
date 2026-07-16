import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Contract } from '../types'
import { ContractSidebar } from './ContractSidebar'

const contract: Contract = {
  id: '1ecce627-d19b-4a73-b3e3-466b39bb3e25',
  organizationId: 'e1cd1118-9795-4937-8e94-1822cae3e78f',
  displayName: 'UM123456 — Testowy przedmiot umowy',
}

describe('ContractSidebar', () => {
  it('shows a compact organization id while retaining the full value as a tooltip', () => {
    render(<ContractSidebar contracts={[contract]} selectedId="" open onClose={vi.fn()} onSelect={vi.fn()} onLogout={vi.fn()} />)

    expect(screen.getByText('Organizacja: e1cd1118…e3e78f')).toHaveAttribute(
      'title',
      'Organizacja: e1cd1118-9795-4937-8e94-1822cae3e78f',
    )
  })

  it('still searches by the complete organization id', async () => {
    const user = userEvent.setup()
    render(<ContractSidebar contracts={[contract]} selectedId="" open onClose={vi.fn()} onSelect={vi.fn()} onLogout={vi.fn()} />)

    await user.type(screen.getByRole('searchbox', { name: 'Szukaj umowy' }), contract.organizationId)

    expect(screen.getByRole('button', { name: /UM123456/ })).toBeInTheDocument()
  })

  it('keeps the search header outside the independently scrollable contract list', () => {
    const { container } = render(<ContractSidebar contracts={[contract]} selectedId="" open onClose={vi.fn()} onSelect={vi.fn()} onLogout={vi.fn()} />)
    const search = screen.getByRole('searchbox', { name: 'Szukaj umowy' })
    const scrollRegion = container.querySelector('.overflow-y-auto')

    expect(scrollRegion).not.toBeNull()
    expect(scrollRegion).toHaveClass('overflow-x-hidden', 'overflow-y-auto')
    expect(scrollRegion).not.toContainElement(search)
    expect(search.closest('.shrink-0')).not.toBeNull()
  })

  it('places logout in the sidebar header instead of showing a document count', () => {
    render(<ContractSidebar contracts={[contract]} selectedId="" open onClose={vi.fn()} onSelect={vi.fn()} onLogout={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Wyloguj' })).toBeInTheDocument()
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })
})
