import { useCallback, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ApiError, api } from './api'
import { AccessScreen, Brand } from './components/AccessScreen'
import { MainScreen } from './components/MainScreen'

function Application() {
  const client = useQueryClient()
  const [requiresAccess, setRequiresAccess] = useState(false)
  const contracts = useQuery({ queryKey: ['contracts'], queryFn: api.contracts, enabled: !requiresAccess, retry: false })
  const unauthorized = contracts.error instanceof ApiError && contracts.error.status === 401

  const onUnauthorized = useCallback(() => {
    client.clear()
    setRequiresAccess(true)
  }, [client])

  async function afterAccess() {
    setRequiresAccess(false)
    await client.fetchQuery({ queryKey: ['contracts'], queryFn: api.contracts })
  }

  async function logout() {
    try { await api.logout() } finally { onUnauthorized() }
  }

  if (requiresAccess || unauthorized) return <AccessScreen onSuccess={afterAccess} />
  if (contracts.isPending) return <div role="status" className="grid min-h-screen place-items-center bg-canvas"><div className="text-center"><div className="mx-auto mb-5"><Brand /></div><div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-1/2 animate-pulse rounded-full bg-brand-blue" /></div><p className="mt-4 text-sm text-slate-500">Sprawdzanie dostępu…</p></div></div>
  if (contracts.isError) return <div role="alert" className="grid min-h-screen place-items-center bg-canvas p-6"><div className="max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold text-brand-navy">Nie można uruchomić aplikacji</h1><p className="mt-3 text-sm leading-6 text-slate-500">Usługa jest chwilowo niedostępna. Spróbuj ponownie.</p><button onClick={() => contracts.refetch()} className="mt-5 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white">Spróbuj ponownie</button></div></div>
  return <MainScreen contracts={contracts.data} onUnauthorized={onUnauthorized} onLogout={logout} />
}

export default function App() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><BrowserRouter><Application /></BrowserRouter></QueryClientProvider>
}
