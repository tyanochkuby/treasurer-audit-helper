import { useMemo, useState } from 'react'
import type { Contract } from '../types'
import { ContractIcon, SearchIcon } from './Icons'

interface Props {
  contracts: Contract[]
  selectedId: string
  open: boolean
  onClose: () => void
  onSelect: (id: string) => void
}

export function ContractSidebar({ contracts, selectedId, open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const matching = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pl')
    if (!term) return contracts
    return contracts.filter((contract) =>
      `${contract.displayName} ${contract.id} ${contract.organizationId}`.toLocaleLowerCase('pl').includes(term))
  }, [contracts, search])

  return <>
    {open && <button aria-label="Zamknij listę umów" onClick={onClose} className="fixed inset-0 z-30 bg-brand-navy/45 backdrop-blur-[1px] lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(88vw,350px)] flex-col border-r border-slate-200 bg-white pt-16 shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:w-[330px] lg:translate-x-0 lg:pt-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Lista umów">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-blue">Umowy</p>
            <h2 className="mt-1 text-lg font-bold text-brand-navy">Wybierz dokument</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{contracts.length}</span>
        </div>
        <label className="relative mt-4 block">
          <span className="sr-only">Szukaj umowy</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Numer, temat, ID organizacji…" className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm text-brand-navy transition placeholder:text-slate-400 focus:border-brand-blue focus:bg-white focus:outline-none" />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {matching.length === 0 ? <div className="px-6 py-10 text-center text-sm text-slate-500">Brak umów pasujących do wyszukiwania.</div> :
          <ul className="divide-y divide-slate-100 py-1">
            {matching.map((contract) => {
              const selected = contract.id === selectedId
              return <li key={contract.id}>
                <button onClick={() => { onSelect(contract.id); onClose() }} aria-current={selected ? 'true' : undefined} className={`group flex w-full gap-3 border-l-4 px-4 py-3.5 text-left transition ${selected ? 'border-brand-blue bg-blue-50/80' : 'border-transparent hover:bg-slate-50'}`}>
                  <ContractIcon className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-brand-blue' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold leading-5 ${selected ? 'text-brand-blue-dark' : 'text-slate-800'}`}>{contract.displayName}</span>
                    <span className="mt-1 block break-all text-[11px] leading-4 text-slate-400">Organizacja: {contract.organizationId}</span>
                  </span>
                </button>
              </li>
            })}
          </ul>}
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500">Wyświetlane są aktywne umowy.</div>
    </aside>
  </>
}
