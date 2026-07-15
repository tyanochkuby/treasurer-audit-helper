import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { AuditEvent } from '../types'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

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

  return <Card className="gap-0 border border-slate-200 bg-white py-0 shadow-sm">
      <Table className="min-w-[1180px] border-collapse text-left">
        <TableCaption className="sr-only">{t('table.caption')}</TableCaption>
        <TableHeader className="bg-brand-navy text-xs font-bold uppercase tracking-wide text-slate-200">
          <TableRow className="border-0 hover:bg-brand-navy"><TableHead className="w-40 px-4 py-3.5 text-slate-200">{t('table.dateTime')}</TableHead><TableHead className="w-52 px-4 py-3.5 text-slate-200">{t('table.user')}</TableHead><TableHead className="w-36 px-4 py-3.5 text-slate-200">{t('table.operation')}</TableHead><TableHead className="w-48 px-4 py-3.5 text-slate-200">{t('table.entity')}</TableHead><TableHead className="w-52 px-4 py-3.5 text-slate-200">{t('table.field')}</TableHead><TableHead className="px-4 py-3.5 text-slate-200">{t('table.previousValue')}</TableHead><TableHead className="px-4 py-3.5 text-slate-200">{t('table.newValue')}</TableHead></TableRow>
        </TableHeader>
        {items.map((item) => {
          const changes = item.changes.length > 0 ? item.changes : [null]
          return <TableBody key={item.id} className="border-b-2 border-slate-200 last:border-b-0">
          {changes.map((change, index) => <TableRow key={`${item.id}-${change?.fieldName ?? index}`} className="align-top odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/40">
            {index === 0 && <>
              <TableCell rowSpan={changes.length} className="whitespace-normal border-r border-slate-100 px-4 py-4 font-semibold text-slate-700"><time dateTime={item.occurredAtUtc}>{dateFormatter.format(new Date(item.occurredAtUtc))}</time><span className="mt-1 block text-[11px] font-normal text-slate-400">{t('table.eventId', { id: item.id })}</span></TableCell>
              <TableCell rowSpan={changes.length} className="whitespace-normal border-r border-slate-100 px-4 py-4"><span className="font-semibold text-slate-800">{item.actorDisplayName}</span><span title={item.actorId} className="mt-1 block truncate text-[11px] text-slate-400">{item.actorId}</span></TableCell>
              <TableCell rowSpan={changes.length} className="whitespace-normal border-r border-slate-100 px-4 py-4"><Badge className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${operationClass(item.operationType)}`}>{operationLabel(item.operationType, t)}</Badge></TableCell>
              <TableCell rowSpan={changes.length} className="whitespace-normal border-r border-slate-100 px-4 py-4"><span className="font-semibold text-slate-800">{entityLabel(item.entityType, t)}</span>{item.entityId && <span title={item.entityId} className="mt-1 block truncate text-[11px] text-slate-400">{item.entityId}</span>}<span className="mt-2 block text-xs leading-5 text-slate-500">{item.description}</span></TableCell>
            </>}
            {change ? <>
              <TableCell className="whitespace-normal border-r border-slate-100 px-4 py-4"><span className="font-semibold text-slate-800">{change.fieldDisplayName ?? '—'}</span>{change.fieldName && change.fieldName !== change.fieldDisplayName && <code className="mt-1 block break-all text-[11px] text-slate-400">{change.fieldName}</code>}</TableCell>
              <TableCell className="whitespace-normal border-r border-slate-100 px-4 py-4 leading-6 text-slate-700"><ValueCell value={change.oldValue} /></TableCell>
              <TableCell className="whitespace-normal px-4 py-4 leading-6 text-slate-700"><ValueCell value={change.newValue} /></TableCell>
            </> : <TableCell colSpan={3} className="whitespace-normal px-4 py-4 text-sm italic text-slate-500">{t('table.noRecordedDifference')}</TableCell>}
          </TableRow>)}
        </TableBody>})}
      </Table>
  </Card>
}
