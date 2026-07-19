import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { createJsonDiff } from '../jsonDiffModel'
import { utcDateTimeFormatter } from '../dateTime'
import type { AuditChange, AuditEvent, Contract } from '../types'
import { ChevronIcon, CopyIcon } from './Icons'
import { JsonDiff } from './JsonDiff'
import { AuditValue } from './AuditValue'
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

function changedFieldsSummary(item: AuditEvent, t: TFunction) {
  const labels = item.changes.map((change) => fieldLabel(change.fieldName, change.fieldDisplayName, item.entityTypeCode, t))
  const visible = labels.slice(0, 2).join(', ')
  return labels.length > 2 ? `${visible} +${labels.length - 2}` : visible
}

function EventHeader({ item, contract, dateFormatter, timeFormatter, utcFormatter, expanded, onToggle, bodyId }: { item: AuditEvent; contract: Pick<Contract, 'displayName' | 'organizationId'>; dateFormatter: Intl.DateTimeFormat; timeFormatter: Intl.DateTimeFormat; utcFormatter: Intl.DateTimeFormat; expanded: boolean; onToggle: () => void; bodyId: string }) {
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

  const expandable = item.changes.length > 0

  return <header className="flex items-stretch bg-slate-50/90 transition-colors hover:bg-slate-100/90">
    <button type="button" disabled={!expandable} aria-expanded={expandable ? expanded : undefined} aria-controls={expandable ? bodyId : undefined} onClick={onToggle} className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-blue disabled:cursor-default sm:flex sm:gap-x-4">
      {expandable && <ChevronIcon className={`h-4 w-4 shrink-0 text-[#8A93A3] transition-transform duration-150 motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`} />}
      <time dateTime={item.occurredAtUtc} title={utcFormatter.format(new Date(item.occurredAtUtc))} className="shrink-0 whitespace-nowrap">
        <span className="text-[15px] font-medium text-[#1F2937]">{dateFormatter.format(new Date(item.occurredAtUtc))}</span>{' '}
        <span className="text-[13px] font-normal text-[#8A93A3]">{timeFormatter.format(new Date(item.occurredAtUtc))}</span>
      </time>
      <Badge className={`shrink-0 justify-self-end rounded-[10px] border px-2.5 py-0.5 text-xs font-medium sm:justify-self-auto ${operationClass(item.operationType)}`}>{operationLabel(item.operationType, t)}</Badge>
      <div className="flex min-w-0 items-center gap-1.5 sm:shrink-0">
        <span className="font-semibold text-slate-800">{entityLabel(item.entityType, item.entityTypeCode, t)}</span>
        <span className="hidden text-slate-400 sm:inline" aria-hidden="true">·</span>
        <span className="hidden text-sm text-[#8A93A3] sm:inline">{t('table.fieldCount', { count: item.changes.length })}</span>
      </div>
      {item.changes.length > 0 && <span className="hidden min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[13px] font-normal text-[#8A93A3] xl:block">{changedFieldsSummary(item, t)}</span>}
      <div className="ml-auto flex min-w-0 items-center justify-end gap-2 overflow-hidden">
        <span title={item.actorId} className="hidden min-w-0 truncate text-[13px] font-normal text-[#8A93A3] md:inline">{item.actorDisplayName}</span>
        <span className="shrink-0 font-mono text-xs font-normal text-[#8A93A3]">#{item.id}</span>
      </div>
    </button>
    <button type="button" onClick={copyTechnicalData} title={copyLabel} aria-label={copyLabel} className="my-auto mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#B0B7C3] transition hover:bg-slate-200 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"><CopyIcon className="h-4 w-4" /></button>
    <span role="status" className="sr-only">{copyState.result !== 'idle' && <span key={copyState.announcement}>{copyState.result === 'copied' ? t('table.technicalDataCopied') : t('table.technicalDataCopyFailed')}</span>}</span>
  </header>
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
      <span className="sr-only">{t('table.newValue')}: </span><AuditValue value={change.newValue} variant="plain" />
    </div> : item.operationType === 'Deleted' ? <div className="min-w-0 px-6 py-4 leading-6">
      <span className="sr-only">{t('table.previousValue')}: </span><AuditValue value={change.oldValue} variant="plain" />
    </div> : <div className="flex min-w-0 flex-wrap items-center gap-3 px-6 py-4 leading-6">
      <div className="max-w-full"><span className="sr-only">{t('table.previousValue')}: </span><AuditValue value={change.oldValue} variant="old" /></div>
      <span className="shrink-0 text-[15px] text-[#B0B7C3]" aria-hidden="true">→</span>
      <div className="max-w-full"><span className="sr-only">{t('table.newValue')}: </span><AuditValue value={change.newValue} variant="new" /></div>
    </div>}
  </div>
}

export const AuditTable = memo(function AuditTable({ items, filtered, contract, expandedIds = new Set(items.map((item) => item.id)), onToggle = () => undefined }: { items: AuditEvent[]; filtered: boolean; contract: Pick<Contract, 'displayName' | 'organizationId'>; expandedIds?: ReadonlySet<string>; onToggle?: (eventId: string, expanded: boolean) => void }) {
  const { t, i18n } = useTranslation()
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Warsaw' }), [i18n.language, i18n.resolvedLanguage])
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Europe/Warsaw' }), [i18n.language, i18n.resolvedLanguage])
  const utcFormatter = useMemo(() => utcDateTimeFormatter(i18n.resolvedLanguage ?? i18n.language), [i18n.language, i18n.resolvedLanguage])
  if (items.length === 0) return <Card className="gap-0 border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl">⌁</div>
    <h3 className="mt-4 text-lg font-bold text-brand-navy">{filtered ? t('table.noFilteredResults') : t('table.noHistory')}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{filtered ? t('table.noFilteredResultsDescription') : t('table.noHistoryDescription')}</p>
  </Card>

  return <ul aria-label={t('table.caption')} className="m-0 list-none space-y-3 p-0">
    {items.map((item) => {
      const expanded = expandedIds.has(item.id)
      const bodyId = `audit-event-${item.id}-body`
      return <li key={item.id}>
      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <EventHeader item={item} contract={contract} dateFormatter={dateFormatter} timeFormatter={timeFormatter} utcFormatter={utcFormatter} expanded={expanded} onToggle={() => onToggle(item.id, !expanded)} bodyId={bodyId} />

        {item.changes.length > 0 && <div id={bodyId} aria-hidden={!expanded} className={`audit-event-body ${expanded ? 'audit-event-body-expanded' : ''}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="divide-y divide-[#E5E9F0] border-t border-[#E5E9F0]">
              {item.changes.map((change, index) => <ChangeRow key={`${item.id}-${change.fieldName ?? index}`} item={item} change={change} />)}
            </div>
          </div>
        </div>}
      </article>
    </li>})}
  </ul>
})
