import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App session states', () => {
  it('shows a loading state while checking the session', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))
    render(<App />)
    expect(screen.getByRole('status')).toHaveTextContent('Sprawdzanie dostępu…')
  })

  it('returns to the access screen after a 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Wprowadź kod dostępu' })).toBeInTheDocument()
  })

  it('shows a request failure instead of an empty contract list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'safe' }), { status: 500, headers: { 'Content-Type': 'application/json' } })))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie można uruchomić aplikacji')
  })
})
