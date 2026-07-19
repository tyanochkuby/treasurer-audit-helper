import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createJsonDiff } from '../jsonDiffModel'
import { JsonDiff } from './JsonDiff'

describe('JsonDiff', () => {
  it('collapses JSON previews and expands only changed leaf paths', async () => {
    const user = userEvent.setup()
    const data = createJsonDiff(
      JSON.stringify({ details: { subject: 'old', unchanged: 1 }, amount: 90, removed: true }),
      JSON.stringify({ details: { subject: 'new', unchanged: 1 }, amount: 100, added: 'x' }),
    )
    expect(data).not.toBeNull()

    render(<JsonDiff data={data!} />)

    expect(screen.getByText('JSON · 4 pola różnią się')).toBeInTheDocument()
    expect(screen.queryByText('details.subject')).not.toBeInTheDocument()
    expect(screen.queryByText('old')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pokaż różnice' }))

    expect(screen.getByText('details.subject')).toBeInTheDocument()
    expect(screen.getByText('amount')).toBeInTheDocument()
    expect(screen.getByText('removed')).toBeInTheDocument()
    expect(screen.getByText('added')).toBeInTheDocument()
    expect(screen.queryByText('details.unchanged')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ukryj różnice' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('does not treat scalar or semantically equal values as a JSON structural diff', () => {
    expect(createJsonDiff('123', '456')).toBeNull()
    expect(createJsonDiff('{"value":1}', '{\n  "value": 1\n}')).toBeNull()
    expect(createJsonDiff('not json', '{}')).toBeNull()
  })

  it('expands added nested objects into changed leaf paths', () => {
    const data = createJsonDiff('{"changes":[]}', JSON.stringify({ changes: [{ changeType: 'TSU03', comment: 'test' }] }))

    expect(data?.changes).toEqual([
      { path: 'changes[0].changeType', newValue: 'TSU03' },
      { path: 'changes[0].comment', newValue: 'test' },
    ])
  })

  it('expands null-to-object and object-to-null changes into leaf paths', () => {
    expect(createJsonDiff(
      JSON.stringify({ details: null }),
      JSON.stringify({ details: { subject: 'new', amount: 100 } }),
    )?.changes).toEqual([
      { path: 'details.subject', newValue: 'new' },
      { path: 'details.amount', newValue: 100 },
    ])

    expect(createJsonDiff(
      JSON.stringify({ details: { subject: 'old', amount: 90 } }),
      JSON.stringify({ details: null }),
    )?.changes).toEqual([
      { path: 'details.subject', oldValue: 'old' },
      { path: 'details.amount', oldValue: 90 },
    ])
  })

  it('uses the regular missing-value convention for added and removed JSON leaves', async () => {
    const user = userEvent.setup()
    const data = createJsonDiff('{}', JSON.stringify({ publishedAt: '2026-07-08' }))
    expect(data).not.toBeNull()

    render(<JsonDiff data={data!} />)
    await user.click(screen.getByRole('button', { name: 'Pokaż różnice' }))

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('→')).toBeInTheDocument()
    expect(screen.getByText('"2026-07-08"')).toHaveClass('bg-[#EDF9F0]')
  })
})
