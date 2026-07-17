import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { createJsonDiff } from '../jsonDiffModel'
import type { AuditChange, AuditEvent, Contract } from '../types'
import { CopyIcon } from './Icons'
import { JsonDiff } from './JsonDiff'
import { Badge } from './ui/badge'
import { Card } from './ui/card'

function operationLabel(operation: string, t: TFunction) {
  if (operation === 'Added' || operation === 'Deleted' || operation === 'Modified') return t(`operations.${operation}`)
  return operation
}

function operationClass(operation: string) {
  if (operation === 'Added') return 'border-[#9FE1CB] bg-[#EDF9F0] text-[#085041]'
  if (operation === 'Deleted') return 'border-[#F5C4B3] bg-[#FEF1F1] text-[#712B13]'
  return 'border-[#B5D4F4] bg-[#E6F1FB] text-[#0C447C]'
}

function entityLabel(entity: string, entityTypeCode: number, t: TFunction) {
  const keys = ['ContractHeaderEntity', 'AnnexHeaderEntity', 'AnnexChangeEntity', 'FileEntity', 'InvoiceEntity', 'PaymentScheduleEntity', 'ContractFundingEntity'] as const
  const key = keys.find((candidate) => candidate === entity)
  if (entityTypeCode === 0 || entityTypeCode > 7) return t('entities.unknownCode', { code: entityTypeCode })
  return key ? t(`entities.${key}`) : t('entities.unknownCode', { code: entityTypeCode })
}

function fieldLabel(fieldName: string | null, fallback: string | null, entityTypeCode: number, t: TFunction) {
  if (!fieldName) return fallback ?? '—'
  const generic = t(`auditFieldLabels.default.${fieldName}`, { defaultValue: fallback ?? fieldName })
  return t(`auditFieldLabels.byEntityType.${entityTypeCode}.${fieldName}`, { defaultValue: generic })
}

function EventHeader({ item, contract, dateFormatter, timeFormatter }: { item: AuditEvent; contract: Pick<Contract, 'displayName' | 'organizationId'>; dateFormatter: Intl.DateTimeFormat; timeFormatter: Intl.DateTimeFormat }) {
  const { t } = useTranslation()
  const [copyState, setCopyState] = useState<{ result: 'idle' | 'copied' | 'error'; announcement: number }>({ result: 'idle', announcement: 0 })
  const resetCopyState = useRef<number | null>(null)
  const technicalData = [`Contract: ${contract.displayName}`, `OrganizationId: ${contract.organizationId}`, `AuditLog.Id: ${item.id}`, ...(item.entityId ? [`EntityId: ${item.entityId}`] : []), `UserId: ${item.actorId}`].join('\n')

  useEffect(() => {
    return () => {
      if (resetCopyState.current !== null) window.clearTimeout(resetCopyState.current)
    }
  }, [])

  function showCopyState(state: 'copied' | 'error') {
    if (resetCopyState.current !== null) window.clearTimeout(resetCopyState.current)
    setCopyState((current) => ({ result: state, announcement: current.announcement + 1 }))
    resetCopyState.current = window.setTimeout(() => {
      setCopyState((current) => ({ ...current, result: 'idle' }))
      resetCopyState.current = null
    }, 2_000)
  }

  async function copyTechnicalData() {
    try {
      await navigator.clipboard.writeText(technicalData)
      showCopyState('copied')
    } catch {
      showCopyState('error')
    }
  }

  const copyLabel = copyState.result === 'copied' ? t('table.technicalDataCopied') : t('table.copyTechnicalData')

  return <header className="bg-slate-50/90 px-4 py-3.5">
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-3">
      <time dateTime={item.occurredAtUtc} className="shrink-0 whitespace-nowrap">
        <span className="text-[15px] font-medium text-[#1F2937]">{dateFormatter.format(new Date(item.occurredAtUtc))}</span>{' '}
        <span className="text-[13px] font-normal text-[#8A93A3]">{timeFormatter.format(new Date(item.occurredAtUtc))}</span>
      </time>
      <Badge className={`shrink-0 justify-self-end rounded-[10px] border px-2.5 py-0.5 text-xs font-medium sm:justify-self-auto ${operationClass(item.operationType)}`}>{operationLabel(item.operationType, t)}</Badge>
      <div className="flex min-w-0 items-center gap-1.5 sm:shrink-0">
        <span className="font-semibold text-slate-800">{entityLabel(item.entityType, item.entityTypeCode, t)}</span>
        <span className="hidden text-slate-400 sm:inline" aria-hidden="true">·</span>
        <span className="hidden text-sm text-[#8A93A3] sm:inline">{t('table.fieldCount', { count: item.changes.length })}</span>
      </div>
      <div className="ml-auto flex w-full min-w-0 items-center justify-end gap-2 overflow-hidden sm:w-auto">
        <span title={item.actorId} className="min-w-0 truncate text-[13px] font-normal text-[#8A93A3]">{item.actorDisplayName}</span>
        <span className="shrink-0 font-mono text-xs font-normal text-[#8A93A3]">#{item.id}</span>
        <button type="button" onClick={copyTechnicalData} title={copyLabel} aria-label={copyLabel} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#B0B7C3] transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"><CopyIcon className="h-4 w-4" /></button>
        <span role="status" className="sr-only">{copyState.result !== 'idle' && <span key={copyState.announcement}>{copyState.result === 'copied' ? t('table.technicalDataCopied') : t('table.technicalDataCopyFailed')}</span>}</span>
      </div>
    </div>
  </header>
}

type ValueVariant = 'old' | 'new' | 'plain'

function valueClass(variant: ValueVariant) {
  if (variant === 'old') return 'rounded-[6px] bg-[#FEF1F1] px-2 py-0.5 text-[13px] font-normal text-[#8A93A3] line-through'
  if (variant === 'new') return 'rounded-[6px] bg-[#EDF9F0] px-2 py-0.5 text-[15px] font-medium text-[#1F2937]'
  return 'text-[15px] font-medium text-[#1F2937]'
}

function formatJson(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed !== null && typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : null
  } catch {
    return null
  }
}

function ValueCell({ value, variant }: { value: string | null; variant: ValueVariant }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if (value === null || value === '') return <span className="text-[15px] text-[#B0B7C3]">—</span>

  const json = formatJson(value)
  const text = json ?? value
  const valueClasses = json
    ? 'block font-mono text-[13px] font-normal leading-6 text-[#1F2937]'
    : `inline ${valueClass(variant)}`
  const isLong = text.length > 90 || text.includes('\n')

  if (!isLong) return <span className={`max-w-full break-words [overflow-wrap:anywhere] ${valueClasses}`}>{text}</span>
  return <div className="max-w-full">
    <span className={`max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${valueClasses}`}>{expanded ? text : `${text.slice(0, 72)}…`}</span>{' '}
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} className="text-xs font-bold text-brand-blue hover:underline">{expanded ? t('table.hideAll') : t('table.showAll')}</button>
  </div>
}

function ChangeRow({ item, change }: { item: AuditEvent; change: AuditChange }) {
  const { t } = useTranslation()
  const displayName = fieldLabel(change.fieldName, change.fieldDisplayName, item.entityTypeCode, t)
  const jsonDiff = useMemo(
    () => item.operationType === 'Modified' ? createJsonDiff(change.oldValue, change.newValue) : null,
    [item.operationType, change.oldValue, change.newValue],
  )

  return <div className="grid bg-white md:grid-cols-[280px_minmax(0,1fr)]">
    <div className="border-b border-[#E5E9F0] bg-slate-50/80 px-6 py-4 md:border-r md:border-b-0 md:bg-white">
      <span className="font-semibold text-slate-800">{displayName}</span>
      {change.fieldName && change.fieldName !== displayName && <code className="mt-1 block break-all text-[11px] text-slate-400">{change.fieldName}</code>}
    </div>
    {jsonDiff ? <div className="min-w-0 px-6 py-4 leading-6"><JsonDiff data={jsonDiff} /></div> : item.operationType === 'Added' ? <div className="min-w-0 px-6 py-4 leading-6">
      <span className="sr-only">{t('table.newValue')}: </span><ValueCell value={change.newValue} variant="plain" />
    </div> : item.operationType === 'Deleted' ? <div className="min-w-0 px-6 py-4 leading-6">
      <span className="sr-only">{t('table.previousValue')}: </span><ValueCell value={change.oldValue} variant="plain" />
    </div> : <div className="flex min-w-0 flex-wrap items-center gap-3 px-6 py-4 leading-6">
      <div className="max-w-full"><span className="sr-only">{t('table.previousValue')}: </span><ValueCell value={change.oldValue} variant="old" /></div>
      <span className="shrink-0 text-[15px] text-[#B0B7C3]" aria-hidden="true">→</span>
      <div className="max-w-full"><span className="sr-only">{t('table.newValue')}: </span><ValueCell value={change.newValue} variant="new" /></div>
    </div>}
  </div>
}

export const AuditTable = memo(function AuditTable({ items, filtered, contract }: { items: AuditEvent[]; filtered: boolean; contract: Pick<Contract, 'displayName' | 'organizationId'> }) {
  const { t, i18n } = useTranslation()
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Warsaw' }), [i18n.language, i18n.resolvedLanguage])
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Warsaw' }), [i18n.language, i18n.resolvedLanguage])
  if (items.length === 0) return <Card className="gap-0 border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl">⌁</div>
    <h3 className="mt-4 text-lg font-bold text-brand-navy">{filtered ? t('table.noFilteredResults') : t('table.noHistory')}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{filtered ? t('table.noFilteredResultsDescription') : t('table.noHistoryDescription')}</p>
  </Card>

  return <div role="list" aria-label={t('table.caption')} className="space-y-3">
    {items.map((item) => <article key={item.id} role="listitem" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <EventHeader item={item} contract={contract} dateFormatter={dateFormatter} timeFormatter={timeFormatter} />

      {item.changes.length > 0 ? <div className="divide-y divide-[#E5E9F0] border-t border-[#E5E9F0]">
        {item.changes.map((change, index) => <ChangeRow key={`${item.id}-${change.fieldName ?? index}`} item={item} change={change} />)}
      </div> : <p className="border-t border-slate-200 px-4 py-4 text-sm italic text-slate-500">{t('table.noRecordedDifference')}</p>}
    </article>)}
  </div>
})
