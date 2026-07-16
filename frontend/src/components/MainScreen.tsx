import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError, api } from '../api'
import type { AuditFilters, Contract } from '../types'
import { AuditFiltersPanel } from './AuditFilters'
import { AuditTable } from './AuditTable'
import { ContractSidebar } from './ContractSidebar'
import { ContractIcon, DownloadIcon, MenuIcon, RefreshIcon } from './Icons'
import { MiddleTruncate } from './MiddleTruncate'
import { Alert } from './ui/alert'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'

function readFilters(params: URLSearchParams): AuditFilters {
  return {
    operationType: params.get('operationType') ?? '',
    entityType: params.get('entityType') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    search: params.get('search') ?? '',
    sort: params.get('sort') === 'asc' ? 'asc' : 'desc',
  }
}

function hasFilters(filters: AuditFilters) {
  return Boolean(filters.operationType || filters.entityType || filters.from || filters.to || filters.search)
}

interface Props {
  contracts: Contract[]
  onUnauthorized: () => void
  onLogout: () => Promise<void>
}

export function MainScreen({ contracts, onUnauthorized, onLogout }: Props) {
  const { t, i18n } = useTranslation()
  const mainRef = useRef<HTMLElement>(null)
  const [params, setParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(!params.get('contractId'))
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const selectedId = params.get('contractId') ?? ''
  const selected = contracts.find((contract) => contract.id === selectedId)
  const filters = useMemo(() => readFilters(params), [params])
  const loadedFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Europe/Warsaw' }), [i18n.language, i18n.resolvedLanguage])

  const history = useQuery({
    queryKey: ['audit', selectedId, filters],
    queryFn: () => api.audit(selectedId, filters),
    enabled: Boolean(selected),
    retry: false,
    refetchOnWindowFocus: false,
  })

  const version = useQuery({
    queryKey: ['audit-version', selectedId],
    queryFn: () => api.version(selectedId),
    enabled: Boolean(selected),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: () => document.visibilityState === 'visible' ? 60_000 : false,
  })

  useEffect(() => {
    const error = history.error ?? version.error
    if (error instanceof ApiError && error.status === 401) onUnauthorized()
  }, [history.error, version.error, onUnauthorized])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])

  const selectContract = useCallback((id: string) => {
    const next = new URLSearchParams(params)
    next.set('contractId', id)
    setParams(next)
    mainRef.current?.scrollTo({ top: 0 })
  }, [params, setParams])

  const applyFilters = useCallback((nextFilters: AuditFilters) => {
    const next = new URLSearchParams(params)
    const keys: (keyof AuditFilters)[] = ['operationType', 'entityType', 'from', 'to', 'search']
    for (const key of keys) {
      if (nextFilters[key]) next.set(key, nextFilters[key])
      else next.delete(key)
    }
    if (nextFilters.sort === 'asc') next.set('sort', 'asc')
    else next.delete('sort')
    setParams(next)
  }, [params, setParams])

  async function refresh() {
    await Promise.all([history.refetch(), version.refetch()])
  }

  async function exportCsv() {
    if (!selected) return
    setExporting(true)
    setExportError('')
    try {
      const result = await api.export(selected.id, filters)
      const url = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = result.fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onUnauthorized()
      else setExportError(t('main.exportError'))
    } finally { setExporting(false) }
  }

  const newDataAvailable = Boolean(history.data && version.data && history.data.version !== version.data.version)
  const unknownEntityTypes = useMemo(() => {
    const codes = new Set(history.data?.items.map((item) => item.entityTypeCode).filter((code) => code > 7) ?? [])
    const selectedCode = Number(filters.entityType)
    if (Number.isInteger(selectedCode) && selectedCode > 7) codes.add(selectedCode)
    return [...codes].sort((left, right) => left - right)
  }, [history.data, filters.entityType])

  return <div className="h-dvh overflow-hidden bg-canvas">
    <div className="flex h-full min-h-0">
      <ContractSidebar contracts={contracts} selectedId={selectedId} open={sidebarOpen} onClose={closeSidebar} onSelect={selectContract} onLogout={onLogout} />
      <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        {!selected ? <div className="h-full p-4 sm:p-6 xl:p-8"><NoSelection onOpen={() => setSidebarOpen(true)} /></div> : <>
          <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200 bg-canvas/95 px-4 py-3 shadow-sm backdrop-blur sm:gap-4 sm:px-6 xl:h-[104px] xl:px-8">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">{t('main.auditHistory')}</p>
              <h1 className="mt-1 min-w-0 overflow-hidden text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"><MiddleTruncate value={selected.displayName} endLength={28} /></h1>
              <p className="mt-1 break-all text-xs text-slate-500">{t('sidebar.organization', { id: selected.organizationId })}</p>
            </div>
            <div className="flex shrink-0 gap-1.5 sm:gap-2">
              <Button variant="outline" onClick={openSidebar} title={t('main.changeContract')} aria-label={t('main.changeContract')} className="h-10 w-10 border-slate-300 bg-white p-0 text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"><MenuIcon className="h-5 w-5" /></Button>
              <Button variant="outline" onClick={refresh} disabled={history.isFetching} title={t('main.refresh')} aria-label={t('main.refresh')} className="h-10 w-10 gap-2 border-slate-300 bg-white p-0 font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto sm:px-3"><RefreshIcon className={`h-5 w-5 ${history.isFetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">{t('main.refresh')}</span></Button>
              <Button onClick={exportCsv} disabled={exporting || history.isPending} title={exporting ? t('main.exporting') : t('main.exportCsv')} aria-label={exporting ? t('main.exporting') : t('main.exportCsv')} className="h-10 w-10 gap-2 bg-brand-amber p-0 font-bold text-brand-navy shadow-sm hover:bg-brand-amber/90 sm:w-auto sm:px-4"><DownloadIcon className="h-5 w-5" /><span className="hidden sm:inline">{exporting ? t('main.exporting') : t('main.exportCsv')}</span></Button>
            </div>
          </div>

          <div className="p-4 sm:p-6 xl:p-8">
            {newDataAvailable && <Alert role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
              <span><strong>{t('main.newDataTitle')}</strong> {t('main.newDataDescription')}</span>
              <Button variant="link" onClick={refresh} className="h-auto p-0 font-bold text-brand-blue">{t('main.refreshNow')}</Button>
            </Alert>}
            {exportError && <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">{exportError}</Alert>}

            <AuditFiltersPanel filters={filters} unknownEntityTypes={unknownEntityTypes} onApply={applyFilters} />

            <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <span>{history.data ? t('main.eventCount', { count: history.data.items.length }) : t('main.history')}</span>
              {history.data && <span>{t('main.loadedAt')} <time dateTime={history.data.generatedAtUtc}>{loadedFormatter.format(new Date(history.data.generatedAtUtc))}</time></span>}
            </div>

            {history.isPending ? <LoadingHistory /> : history.isError ? <RequestError onRetry={() => history.refetch()} /> : <AuditTable items={history.data.items} filtered={hasFilters(filters)} contract={selected} />}
          </div>
        </>}
      </main>
    </div>
  </div>
}

function NoSelection({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation()
  return <div className="grid min-h-full place-items-center">
    <div className="max-w-lg text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-100 text-brand-blue"><ContractIcon className="h-8 w-8" /></div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-brand-navy">{t('main.noSelectionTitle')}</h1>
      <p className="mt-3 leading-7 text-slate-500">{t('main.noSelectionDescription')}</p>
      <Button onClick={onOpen} className="mt-6 h-auto bg-brand-blue px-5 py-3 font-bold text-white shadow-sm hover:bg-brand-blue-dark lg:hidden">{t('main.showContracts')}</Button>
    </div>
  </div>
}

function LoadingHistory() {
  const { t } = useTranslation()
  return <Card role="status" aria-label={t('main.loadingHistory')} className="gap-3 border-0 bg-transparent p-0 shadow-none">
    {[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-slate-50 px-4 py-3.5">
        <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-16" /></div>
        <Skeleton className="h-6 w-24 rounded-full" />
        <div className="min-w-40 flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 max-w-72" /></div>
        <div className="space-y-2"><Skeleton className="ml-auto h-4 w-40" /><Skeleton className="ml-auto h-3 w-28" /></div>
      </div>
      <div className="grid border-t border-[#E5E9F0] md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="border-b border-[#E5E9F0] px-6 py-4 md:border-r md:border-b-0"><Skeleton className="h-4 w-36" /></div>
        <div className="flex flex-wrap items-center gap-3 px-6 py-4"><Skeleton className="h-6 w-28 rounded-[6px]" /><span className="text-[#B0B7C3]" aria-hidden="true">→</span><Skeleton className="h-6 w-36 rounded-[6px]" /></div>
      </div>
    </div>)}
  </Card>
}

function RequestError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return <Card role="alert" className="gap-0 border border-red-200 bg-white px-6 py-12 text-center shadow-sm"><h3 className="text-lg font-bold text-red-800">{t('main.requestErrorTitle')}</h3><p className="mt-2 text-sm text-slate-500">{t('main.requestErrorDescription')}</p><Button onClick={onRetry} className="mx-auto mt-5 bg-brand-blue px-4 font-bold text-white hover:bg-brand-blue-dark">{t('app.retry')}</Button></Card>
}
