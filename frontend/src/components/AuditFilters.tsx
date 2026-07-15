import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { AuditFilters } from '../types'
import { FilterIcon, SearchIcon } from './Icons'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const input = 'h-10 w-full border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm'
const operationLabels: Record<string, string> = { '': 'Wszystkie', Added: 'Dodano', Modified: 'Zmodyfikowano', Deleted: 'Usunięto' }
const entityLabels: Record<string, string> = { '': 'Wszystkie', '0': 'Nieznana (0)', '1': 'Umowa', '2': 'Aneks', '3': 'Zmiana aneksu', '4': 'Plik', '5': 'Faktura', '6': 'Harmonogram płatności', '7': 'Finansowanie umowy' }

function entitySelectLabel(value: string) {
  return entityLabels[value] ?? `Unknown (${value})`
}

export function AuditFiltersPanel({ filters, unknownEntityTypes, onApply }: { filters: AuditFilters; unknownEntityTypes: number[]; onApply: (filters: AuditFilters) => void }) {
  const [draft, setDraft] = useState(filters)
  useEffect(() => setDraft(filters), [filters])

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

  return <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
      <FilterIcon className="h-5 w-5 text-brand-blue" />
      <h2 className="font-bold text-brand-navy">Filtry historii</h2>
    </div>
    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr_1fr]">
      <Label className="block sm:col-span-2 xl:col-span-1">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Szukaj w zmianach</span>
        <span className="relative block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={draft.search} maxLength={100} onChange={(event) => update('search', event.target.value)} placeholder="Użytkownik, pole, wartość…" className={`${input} pl-9`} />
        </span>
      </Label>
      <div>
        <Label id="operation-label" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Operacja</Label>
        <Select value={draft.operationType} onValueChange={(value) => update('operationType', value ?? '')}>
          <SelectTrigger aria-labelledby="operation-label" className={input}><SelectValue>{operationLabels[draft.operationType]}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="">Wszystkie</SelectItem><SelectItem value="Added">Dodano</SelectItem><SelectItem value="Modified">Zmodyfikowano</SelectItem><SelectItem value="Deleted">Usunięto</SelectItem></SelectContent>
        </Select>
      </div>
      <div>
        <Label id="entity-label" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Encja</Label>
        <Select value={draft.entityType} onValueChange={(value) => update('entityType', value ?? '')}>
          <SelectTrigger aria-labelledby="entity-label" className={input}><SelectValue>{entitySelectLabel(draft.entityType)}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Wszystkie</SelectItem>
            <SelectItem value="0">Nieznana (0)</SelectItem><SelectItem value="1">Umowa</SelectItem><SelectItem value="2">Aneks</SelectItem><SelectItem value="3">Zmiana aneksu</SelectItem><SelectItem value="4">Plik</SelectItem><SelectItem value="5">Faktura</SelectItem><SelectItem value="6">Harmonogram płatności</SelectItem><SelectItem value="7">Finansowanie umowy</SelectItem>
            {unknownEntityTypes.map((code) => <SelectItem key={code} value={String(code)}>Unknown ({code})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Od</span><Input type="date" value={draft.from} onChange={(event) => update('from', event.target.value)} className={input} /></Label>
      <Label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Do</span><Input type="date" value={draft.to} onChange={(event) => update('to', event.target.value)} className={input} /></Label>
    </div>
    <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <Label id="sort-label">Kolejność</Label>
        <Select value={draft.sort} onValueChange={(value) => update('sort', value as AuditFilters['sort'])}>
          <SelectTrigger aria-labelledby="sort-label" className="h-9 border-slate-300 bg-white px-2.5 text-sm text-slate-700"><SelectValue>{draft.sort === 'desc' ? 'Najnowsze najpierw' : 'Najstarsze najpierw'}</SelectValue></SelectTrigger>
          <SelectContent><SelectItem value="desc">Najnowsze najpierw</SelectItem><SelectItem value="asc">Najstarsze najpierw</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={clear} className="h-9 px-3 font-bold text-slate-600 hover:bg-slate-200">Wyczyść</Button>
        <Button type="submit" className="h-9 bg-brand-blue px-4 font-bold text-white hover:bg-brand-blue-dark">Zastosuj filtry</Button>
      </div>
    </div>
  </form>
}
