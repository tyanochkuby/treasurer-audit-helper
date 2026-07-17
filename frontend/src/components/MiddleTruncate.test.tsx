import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MiddleTruncate } from './MiddleTruncate'

describe('MiddleTruncate', () => {
  it('keeps both ends of a long value and exposes the complete text', () => {
    const value = 'e00a54f4-762c-4ebc-83f7-f8655e642f10'
    render(<MiddleTruncate value={value} />)

    const text = screen.getByTitle(value)
    expect(text).toHaveTextContent(value)
    expect(text.children).toHaveLength(2)
    expect(text.firstElementChild).toHaveClass('truncate')
    expect(text.lastElementChild).toHaveClass('shrink-0')
  })

  it('keeps whitespace away from the truncation boundary', () => {
    const value = 'A long document name with a meaningful ending'
    render(<MiddleTruncate value={value} endLength={18} />)

    const text = screen.getByTitle(value)
    expect(text).toHaveTextContent(value)
    expect(text.firstElementChild?.textContent).not.toMatch(/\s$/u)
    expect(text.lastElementChild?.textContent).not.toMatch(/^\s/u)
  })
})
