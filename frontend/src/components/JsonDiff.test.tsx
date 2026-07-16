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
})
