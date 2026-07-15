import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { AuditFilters } from '../types'
import { FilterIcon, SearchIcon } from './Icons'

const input = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm transition focus:border-brand-blue focus:outline-none'

export function AuditFiltersPanel({ filters, onApply }: { filters: AuditFilters; onApply: (filters: AuditFilters) => void }) {
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
      <label className="block sm:col-span-2 xl:col-span-1">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Szukaj w zmianach</span>
        <span className="relative block">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={draft.search} maxLength={100} onChange={(event) => update('search', event.target.value)} placeholder="Użytkownik, pole, wartość…" className={`${input} pl-9`} />
        </span>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Operacja</span>
        <select value={draft.operationType} onChange={(event) => update('operationType', event.target.value)} className={input}>
          <option value="">Wszystkie</option><option value="Added">Dodano</option><option value="Modified">Zmodyfikowano</option><option value="Deleted">Usunięto</option>
        </select>
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Encja</span>
        <select value={draft.entityType} onChange={(event) => update('entityType', event.target.value)} className={input}>
          <option value="">Wszystkie</option>
          <option value="0">Nieznana (0)</option><option value="1">Umowa</option><option value="2">Aneks</option><option value="3">Zmiana aneksu</option><option value="4">Plik</option><option value="5">Faktura</option><option value="6">Harmonogram płatności</option><option value="7">Finansowanie umowy</option>
          {Array.from({ length: 10 }, (_, index) => index + 8).map((code) => <option key={code} value={code}>Unknown ({code})</option>)}
        </select>
      </label>
      <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Od</span><input type="date" value={draft.from} onChange={(event) => update('from', event.target.value)} className={input} /></label>
      <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Do</span><input type="date" value={draft.to} onChange={(event) => update('to', event.target.value)} className={input} /></label>
    </div>
    <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
        Kolejność
        <select value={draft.sort} onChange={(event) => update('sort', event.target.value as AuditFilters['sort'])} className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-700">
          <option value="desc">Najnowsze najpierw</option><option value="asc">Najstarsze najpierw</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="h-9 rounded-lg px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">Wyczyść</button>
        <button type="submit" className="h-9 rounded-lg bg-brand-blue px-4 text-sm font-bold text-white transition hover:bg-brand-blue-dark">Zastosuj filtry</button>
      </div>
    </div>
  </form>
}
