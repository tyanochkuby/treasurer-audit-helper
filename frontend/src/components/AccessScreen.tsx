import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, api } from '../api'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

export function AccessScreen({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.access(code)
      setCode('')
      await onSuccess()
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 401
        ? 'Nieprawidłowy kod dostępu.'
        : 'Nie udało się zalogować. Spróbuj ponownie później.')
    } finally { setSubmitting(false) }
  }

  return <main className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.75fr)]">
    <section className="relative hidden overflow-hidden bg-brand-navy px-16 py-14 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-32 top-24 h-96 w-96 rounded-full border border-white/10" />
      <div className="absolute -right-16 top-40 h-64 w-64 rounded-full bg-brand-blue/20" />
      <Brand light />
      <div className="relative max-w-xl pb-12">
        <p className="mb-5 text-sm font-bold uppercase tracking-[0.22em] text-blue-300">Przygotuj dane do kontroli</p>
        <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">Historia zmian umów w jednym miejscu</h1>
        <p className="mt-7 max-w-lg text-lg leading-8 text-slate-300">Znajdź, przejrzyj i wyeksportuj pełną historię zmian wybranej umowy.</p>
      </div>
      <p className="text-sm text-slate-400">Dostęp do danych audytowych</p>
    </section>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-12">
      <div className="w-full max-w-md">
        <div className="mb-12 lg:hidden"><Brand /></div>
        <Card className="block gap-0 rounded-2xl border border-slate-200 bg-white py-0 shadow-[0_18px_60px_rgba(11,31,58,0.09)]">
          <CardContent className="p-7 sm:p-10">
          <p className="text-sm font-semibold text-brand-blue">Bezpieczny dostęp</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy">Wprowadź kod dostępu</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Kod otrzymasz od administratora systemu.</p>
          <form className="mt-8" onSubmit={submit}>
            <Label htmlFor="access-code" className="mb-2 block text-sm font-semibold text-slate-700">Kod dostępu</Label>
            <Input id="access-code" type="password" autoComplete="current-password" required value={code} onChange={(event) => setCode(event.target.value)} className="h-12 bg-white px-4 text-brand-navy shadow-sm" aria-describedby={error ? 'access-error' : undefined} />
            {error && <p id="access-error" role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
            <Button type="submit" disabled={submitting || !code} className="mt-6 h-12 w-full bg-brand-blue px-5 font-bold text-white shadow-sm hover:bg-brand-blue-dark">{submitting ? 'Sprawdzanie…' : 'Przejdź do historii'}</Button>
          </form>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Kod dostępu nie jest zapisywany w przeglądarce.</p>
      </div>
    </section>
  </main>
}

export function Brand({ light = false }: { light?: boolean }) {
  return <div className="relative flex items-center gap-3">
    <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-amber font-black text-brand-navy shadow-sm">HZ</span>
    <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-brand-navy'}`}>Historia zmian umów</span>
  </div>
}
