import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { AuditEvent } from '../types'
import { ArrowRightIcon } from './Icons'
import { Badge } from './ui/badge'
import { Card } from './ui/card'

function operationLabel(operation: string, t: TFunction) {
  if (operation === 'Added' || operation === 'Deleted' || operation === 'Modified') return t(`operations.${operation}`)
  return operation
}

function operationClass(operation: string) {
  if (operation === 'Added') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (operation === 'Deleted') return 'bg-red-50 text-red-700 ring-red-600/20'
  return 'bg-blue-50 text-blue-700 ring-blue-600/20'
}

function entityLabel(entity: string, t: TFunction) {
  const keys = ['Unknown', 'ContractHeaderEntity', 'AnnexHeaderEntity', 'AnnexChangeEntity', 'FileEntity', 'InvoiceEntity', 'PaymentScheduleEntity', 'ContractFundingEntity'] as const
  const key = keys.find((candidate) => candidate === entity)
  return key ? t(`entities.${key}`) : entity
}

function ValueCell({ value }: { value: string | null }) {
  const { t } = useTranslation()
  if (value === null || value === '') return <span className="text-slate-400">—</span>
  const isLong = value.length > 90 || value.includes('\n')
  if (!isLong) return <span className="break-words">{value}</span>
  return <details className="group max-w-[28rem]">
    <summary className="cursor-pointer list-none text-brand-blue hover:underline">{value.slice(0, 72)}… <span className="text-xs font-bold">{t('table.showAll')}</span></summary>
    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">{value}</pre>
  </details>
}

export function AuditTable({ items, filtered }: { items: AuditEvent[]; filtered: boolean }) {
  const { t, i18n } = useTranslation()
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Europe/Warsaw' }), [i18n.language, i18n.resolvedLanguage])
  if (items.length === 0) return <Card className="gap-0 border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl">⌁</div>
    <h3 className="mt-4 text-lg font-bold text-brand-navy">{filtered ? t('table.noFilteredResults') : t('table.noHistory')}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{filtered ? t('table.noFilteredResultsDescription') : t('table.noHistoryDescription')}</p>
  </Card>

  return <div role="list" aria-label={t('table.caption')} className="space-y-3">
    {items.map((item) => <article key={item.id} role="listitem" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="bg-slate-50/90 px-4 py-3.5">
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          <div className="shrink-0">
            <time dateTime={item.occurredAtUtc} className="block font-semibold text-slate-800">{dateFormatter.format(new Date(item.occurredAtUtc))}</time>
            <span className="mt-1 block font-mono text-[11px] text-slate-400">{t('table.eventId', { id: item.id })}</span>
          </div>
          <Badge className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${operationClass(item.operationType)}`}>{operationLabel(item.operationType, t)}</Badge>
          <div className="min-w-48 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-slate-800">{entityLabel(item.entityType, t)}</span>
              <span className="text-xs text-slate-500">{t('table.fieldCount', { count: item.changes.length })}</span>
            </div>
            {item.entityId && <code title={item.entityId} className="mt-1 block max-w-xl truncate text-[11px] text-slate-400">{item.entityId}</code>}
          </div>
          <div className="min-w-40 max-w-64 sm:text-right">
            <span className="block font-semibold text-slate-800">{item.actorDisplayName}</span>
            <code title={item.actorId} className="mt-1 block truncate text-[11px] text-slate-400">{item.actorId}</code>
          </div>
        </div>
      </header>

      {item.changes.length > 0 ? <div className="divide-y divide-slate-200 border-t border-slate-200">
        {item.changes.map((change, index) => <div key={`${item.id}-${change.fieldName ?? index}`} className="grid bg-white hover:bg-blue-50/40 md:grid-cols-[minmax(10rem,28%)_minmax(0,1fr)]">
          <div className="border-b border-slate-100 px-4 py-3.5 md:border-r md:border-b-0">
            <span className="font-semibold text-slate-800">{change.fieldDisplayName ?? '—'}</span>
            {change.fieldName && change.fieldName !== change.fieldDisplayName && <code className="mt-1 block break-all text-[11px] text-slate-400">{change.fieldName}</code>}
          </div>
          {item.operationType === 'Added' ? <div className="min-w-0 px-4 py-3.5 leading-6 text-slate-700">
            <span className="sr-only">{t('table.newValue')}: </span><ValueCell value={change.newValue} />
          </div> : item.operationType === 'Deleted' ? <div className="min-w-0 px-4 py-3.5 leading-6 text-slate-700">
            <span className="sr-only">{t('table.previousValue')}: </span><ValueCell value={change.oldValue} />
          </div> : <div className="flex min-w-0 flex-wrap items-center gap-3 px-4 py-3.5 leading-6 text-slate-700">
            <div className="min-w-48 flex-1"><span className="sr-only">{t('table.previousValue')}: </span><ValueCell value={change.oldValue} /></div>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-48 flex-1"><span className="sr-only">{t('table.newValue')}: </span><ValueCell value={change.newValue} /></div>
          </div>}
        </div>)}
      </div> : <p className="border-t border-slate-200 px-4 py-4 text-sm italic text-slate-500">{t('table.noRecordedDifference')}</p>}
    </article>)}
  </div>
}
