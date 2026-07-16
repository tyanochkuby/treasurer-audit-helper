import { render, screen } from '@testing-library/react'
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
})
