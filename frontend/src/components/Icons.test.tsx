import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RefreshIcon } from './Icons'

describe('RefreshIcon', () => {
  it('uses one continuous circular-arrow path', () => {
    const { container } = render(<RefreshIcon data-testid="refresh-icon" />)
    const paths = container.querySelectorAll('path')

    expect(paths).toHaveLength(1)
    expect(paths[0]).toHaveAttribute('d', 'M20 5v6h-6m5.1-3A8 8 0 1 0 20 14')
  })
})
