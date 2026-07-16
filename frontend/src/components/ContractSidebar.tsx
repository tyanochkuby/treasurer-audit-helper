import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Contract } from '../types'
import { formatOrganizationId } from '../formatOrganizationId'
import { LogoutIcon, SearchIcon } from './Icons'
import { MiddleTruncate } from './MiddleTruncate'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface Props {
  contracts: Contract[]
  selectedId: string
  open: boolean
  onClose: () => void
  onSelect: (id: string) => void
  onLogout: () => Promise<void>
}

export function ContractSidebar({ contracts, selectedId, open, onClose, onSelect, onLogout }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const matching = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pl')
    if (!term) return contracts
    return contracts.filter((contract) =>
      `${contract.displayName} ${contract.id} ${contract.organizationId}`.toLocaleLowerCase('pl').includes(term))
  }, [contracts, search])

  const contractItems = useMemo(() => matching.map((contract) => {
    const selected = contract.id === selectedId
    return <li key={contract.id} className="min-w-0 [contain-intrinsic-size:auto_69px] [content-visibility:auto]">
      <Button variant="ghost" onClick={() => { onSelect(contract.id); onClose() }} aria-current={selected ? 'true' : undefined} className={`group h-auto w-full min-w-0 max-w-full justify-start gap-3 rounded-none border-l-4 px-4 py-3.5 text-left whitespace-normal ${selected ? 'border-brand-blue bg-blue-50/80 hover:bg-blue-50/80' : 'border-transparent hover:bg-slate-50'}`}>
        <span title={t('sidebar.auditEventCount', { count: contract.auditEventCount })} aria-label={t('sidebar.auditEventCount', { count: contract.auditEventCount })} className={`grid min-w-8 shrink-0 place-items-center rounded-full px-1.5 py-1 font-mono text-[11px] font-semibold leading-4 ${selected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>{contract.auditEventCount}</span>
        <span className="min-w-0 flex-1">
          <MiddleTruncate value={contract.displayName} className={`text-sm font-semibold leading-5 ${selected ? 'text-brand-blue-dark' : 'text-slate-800'}`} />
          <span className="mt-1 block truncate whitespace-nowrap text-[11px] leading-4 text-slate-400" title={t('sidebar.organization', { id: contract.organizationId })}>{t('sidebar.organization', { id: formatOrganizationId(contract.organizationId) })}</span>
        </span>
      </Button>
    </li>
  }), [matching, onClose, onSelect, selectedId, t])

  return <>
    {open && <button aria-label={t('sidebar.close')} onClick={onClose} className="fixed inset-0 z-30 bg-brand-navy/45 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(88vw,350px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-100 will-change-transform lg:static lg:z-auto lg:w-[330px] lg:translate-x-0 lg:shadow-none lg:transition-none ${open ? 'translate-x-0' : '-translate-x-full'}`} aria-label={t('sidebar.label')}>
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-blue">{t('sidebar.eyebrow')}</p>
            <h2 className="mt-1 text-lg font-bold text-brand-navy">{t('sidebar.title')}</h2>
          </div>
          <Button variant="ghost" onClick={onLogout} className="h-9 gap-2 px-2.5 font-bold text-slate-600 hover:bg-slate-100 hover:text-brand-navy"><LogoutIcon className="h-4 w-4" />{t('main.logout')}</Button>
        </div>
        <Label className="relative mt-4 block">
          <span className="sr-only">{t('sidebar.searchLabel')}</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder={t('sidebar.searchPlaceholder')} className="h-11 border-slate-300 bg-slate-50 pl-10 pr-3 text-brand-navy placeholder:text-slate-400 focus:bg-white" />
        </Label>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [contain:layout_paint]" aria-live="polite">
        {matching.length === 0 ? <div className="px-6 py-10 text-center text-sm text-slate-500">{t('sidebar.empty')}</div> :
          <ul className="min-w-0 divide-y divide-slate-100 py-1">{contractItems}</ul>}
      </div>
    </aside>
  </>
}
