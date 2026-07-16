import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MiddleTruncate } from './MiddleTruncate'

describe('MiddleTruncate', () => {
  it('keeps both ends of a long value and exposes the complete text', () => {
    const value = 'UM/2026 — Bardzo długa nazwa dokumentu z istotnym zakończeniem'
    render(<MiddleTruncate value={value} endLength={18} />)

    const text = screen.getByTitle(value)
    expect(text).toHaveTextContent(value)
    expect(text.children).toHaveLength(2)
    expect(text.firstElementChild).toHaveClass('truncate')
    expect(text.lastElementChild).toHaveClass('shrink-0')
  })
})
