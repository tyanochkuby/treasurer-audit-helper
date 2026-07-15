import { useCallback, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError, api } from './api'
import { AccessScreen, Brand } from './components/AccessScreen'
import { MainScreen } from './components/MainScreen'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Skeleton } from './components/ui/skeleton'

function Application() {
  const { t } = useTranslation()
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
  if (contracts.isPending) return <div role="status" className="grid min-h-screen place-items-center bg-canvas"><div className="text-center"><div className="mx-auto mb-5"><Brand /></div><div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-slate-200"><Skeleton className="h-full w-1/2 rounded-full bg-brand-blue" /></div><p className="mt-4 text-sm text-slate-500">{t('app.loadingAccess')}</p></div></div>
  if (contracts.isError) return <div role="alert" className="grid min-h-screen place-items-center bg-canvas p-6"><Card className="max-w-md gap-0 border border-red-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold text-brand-navy">{t('app.unavailableTitle')}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{t('app.unavailableDescription')}</p><Button onClick={() => contracts.refetch()} className="mx-auto mt-5 h-auto bg-brand-blue px-5 py-2.5 font-bold text-white hover:bg-brand-blue-dark">{t('app.retry')}</Button></Card></div>
  return <MainScreen contracts={contracts.data} onUnauthorized={onUnauthorized} onLogout={logout} />
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language
    document.title = t('app.title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'))
  }, [i18n.language, i18n.resolvedLanguage, t])
  return <QueryClientProvider client={client}><BrowserRouter><Application /></BrowserRouter></QueryClientProvider>
}
