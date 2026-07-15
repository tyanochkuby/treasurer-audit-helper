import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccessScreen } from './AccessScreen'

describe('AccessScreen', () => {
  it('submits the access code and continues after success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const onSuccess = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<AccessScreen onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText('Kod dostępu'), 'secret-code')
    await user.click(screen.getByRole('button', { name: 'Przejdź do historii' }))

    expect(fetchMock).toHaveBeenCalledWith('/api/access', expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'secret-code' }) }))
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('shows a generic invalid-code error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'detail' }), { status: 401, headers: { 'Content-Type': 'application/json' } })))
    const user = userEvent.setup()
    render(<AccessScreen onSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText('Kod dostępu'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Przejdź do historii' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Nieprawidłowy kod dostępu.')
  })
})
