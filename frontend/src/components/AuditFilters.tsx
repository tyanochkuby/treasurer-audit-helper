import { memo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuditFilters } from '../types'
import { FilterIcon, SearchIcon } from './Icons'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const input = 'h-10 w-full border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm'
const operationOptions = [{ value: 'Added', key: 'operations.Added' }, { value: 'Modified', key: 'operations.Modified' }, { value: 'Deleted', key: 'operations.Deleted' }] as const
const entityOptions = [
  { value: '0', key: 'entities.unknownZero' },
  { value: '1', key: 'entities.ContractHeaderEntity' },
  { value: '2', key: 'entities.AnnexHeaderEntity' },
  { value: '3', key: 'entities.AnnexChangeEntity' },
  { value: '4', key: 'entities.FileEntity' },
  { value: '5', key: 'entities.InvoiceEntity' },
  { value: '6', key: 'entities.PaymentScheduleEntity' },
  { value: '7', key: 'entities.ContractFundingEntity' },
] as const

interface Props {
  filters: AuditFilters
  unknownEntityTypes: number[]
  onApply: (filters: AuditFilters) => void
}

export const AuditFiltersPanel = memo(function AuditFiltersPanel(props: Props) {
  return <AuditFiltersForm key={JSON.stringify(props.filters)} {...props} />
})

function AuditFiltersForm({ filters, unknownEntityTypes, onApply }: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(filters)

  function update<Key extends keyof AuditFilters>(key: Key, value: AuditFilters[Key]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    onApply({ ...draft, search: draft.search.trim() })
  }

  function clear() {
    const empty: AuditFilters = { operationType: '', entityType: '', from: '', to: '', search: '', sort: 'desc' }
    setDraft(empty)
    onApply(empty)
  }

  const selectedOperation = operationOptions.find((option) => option.value === draft.operationType)
  const selectedEntity = entityOptions.find((option) => option.value === draft.entityType)
  const operationLabel = selectedOperation ? t(selectedOperation.key) : t('filters.all')
  const entityLabel = selectedEntity ? t(selectedEntity.key) : draft.entityType ? t('entities.unknownCode', { code: draft.entityType }) : t('filters.all')

  return <form onSubmit={submit} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
      <FilterIcon className="h-5 w-5 text-brand-blue" />
      <h2 className="font-bold text-brand-navy">{t('filters.title')}</h2>
    </div>
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr_1fr]">
      <Label className="block sm:col-span-2 xl:col-span-1">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('filters.searchLabel')}</span>
        <span className="relative block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={draft.search} maxLength={100} onChange={(event) => update('search', event.target.value)} placeholder={t('filters.searchPlaceholder')} className={`${input} pl-9`} />
        </span>
      </Label>
      <div>
        <Label id="operation-label" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('filters.operation')}</Label>
        <Select value={draft.operationType} onValueChange={(value) => update('operationType', value ?? '')}>
          <SelectTrigger size="lg" aria-labelledby="operation-label" className={input}><SelectValue>{operationLabel}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="">{t('filters.all')}</SelectItem>{operationOptions.map((option) => <SelectItem key={option.value} value={option.value}>{t(option.key)}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label id="entity-label" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('filters.entity')}</Label>
        <Select value={draft.entityType} onValueChange={(value) => update('entityType', value ?? '')}>
          <SelectTrigger size="lg" aria-labelledby="entity-label" className={input}><SelectValue>{entityLabel}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('filters.all')}</SelectItem>
            {entityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{t(option.key)}</SelectItem>)}
            {unknownEntityTypes.map((code) => <SelectItem key={code} value={String(code)}>{t('entities.unknownCode', { code })}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('filters.from')}</span><Input type="date" value={draft.from} onChange={(event) => update('from', event.target.value)} className={input} /></Label>
      <Label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{t('filters.to')}</span><Input type="date" value={draft.to} onChange={(event) => update('to', event.target.value)} className={input} /></Label>
    </div>
    <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-600">
        <Label id="sort-label">{t('filters.sort')}</Label>
        <Select value={draft.sort} onValueChange={(value) => update('sort', value as AuditFilters['sort'])}>
          <SelectTrigger aria-labelledby="sort-label" className="h-9 min-w-0 flex-1 border-slate-300 bg-white px-2.5 text-sm text-slate-700 sm:flex-none"><SelectValue>{draft.sort === 'desc' ? t('filters.newestFirst') : t('filters.oldestFirst')}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="desc">{t('filters.newestFirst')}</SelectItem><SelectItem value="asc">{t('filters.oldestFirst')}</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button type="button" variant="ghost" onClick={clear} className="h-9 w-full px-3 font-bold text-slate-600 hover:bg-slate-200 sm:w-auto">{t('filters.clear')}</Button>
        <Button type="submit" className="h-9 w-full bg-brand-blue px-4 font-bold text-white hover:bg-brand-blue-dark sm:w-auto">{t('filters.apply')}</Button>
      </div>
    </div>
  </form>
}
