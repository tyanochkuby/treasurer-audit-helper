import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuditFilters } from '../types'
import { AuditFiltersPanel } from './AuditFilters'

const filters: AuditFilters = {
  operationType: '',
  entityType: '',
  from: '',
  to: '',
  search: '',
  sort: 'desc',
}

describe('AuditFiltersPanel', () => {
  it('keeps the mobile filter actions in an equal two-column row', () => {
    render(<AuditFiltersPanel filters={filters} unknownEntityTypes={[]} onApply={vi.fn()} />)

    const clear = screen.getByRole('button', { name: 'Wyczyść' })
    const apply = screen.getByRole('button', { name: 'Zastosuj filtry' })
    expect(clear.parentElement).toHaveClass('grid', 'grid-cols-2', 'sm:flex')
    expect(clear).toHaveClass('w-full', 'sm:w-auto')
    expect(apply).toHaveClass('w-full', 'sm:w-auto')
  })

  it('resets an unfinished draft when the applied filters change', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AuditFiltersPanel filters={filters} unknownEntityTypes={[]} onApply={vi.fn()} />)
    const search = screen.getByRole('textbox', { name: 'Szukaj w zmianach' })

    await user.type(search, 'unfinished')
    rerender(<AuditFiltersPanel filters={{ ...filters, search: 'applied' }} unknownEntityTypes={[]} onApply={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Szukaj w zmianach' })).toHaveValue('applied')
  })
})
