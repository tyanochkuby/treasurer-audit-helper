import type { AuditEvent } from '../types'

const dateFormatter = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Europe/Warsaw' })

function operationLabel(operation: string) {
  return operation === 'Added' ? 'Dodano' : operation === 'Deleted' ? 'Usunięto' : operation === 'Modified' ? 'Zmodyfikowano' : operation
}

function operationClass(operation: string) {
  if (operation === 'Added') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (operation === 'Deleted') return 'bg-red-50 text-red-700 ring-red-600/20'
  return 'bg-blue-50 text-blue-700 ring-blue-600/20'
}

function entityLabel(entity: string) {
  const labels: Record<string, string> = {
    Unknown: 'Nieznana', ContractHeaderEntity: 'Umowa', AnnexHeaderEntity: 'Aneks', AnnexChangeEntity: 'Zmiana aneksu', FileEntity: 'Plik', InvoiceEntity: 'Faktura', PaymentScheduleEntity: 'Harmonogram płatności', ContractFundingEntity: 'Finansowanie umowy',
  }
  return labels[entity] ?? entity
}

function ValueCell({ value }: { value: string | null }) {
  if (value === null || value === '') return <span className="text-slate-400">—</span>
  const isLong = value.length > 90 || value.includes('\n')
  if (!isLong) return <span className="break-words">{value}</span>
  return <details className="group max-w-[28rem]">
    <summary className="cursor-pointer list-none text-brand-blue hover:underline">{value.slice(0, 72)}… <span className="text-xs font-bold">Pokaż całość</span></summary>
    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">{value}</pre>
  </details>
}

export function AuditTable({ items, filtered }: { items: AuditEvent[]; filtered: boolean }) {
  if (items.length === 0) return <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl">⌁</div>
    <h3 className="mt-4 text-lg font-bold text-brand-navy">{filtered ? 'Brak wyników dla wybranych filtrów' : 'Brak historii zmian'}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{filtered ? 'Zmień lub wyczyść filtry, aby zobaczyć inne wpisy.' : 'Dla tej umowy nie znaleziono jeszcze wpisów audytowych.'}</p>
  </div>

  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
        <caption className="sr-only">Historia zmian wybranej umowy</caption>
        <thead className="bg-brand-navy text-xs font-bold uppercase tracking-wide text-slate-200">
          <tr><th className="w-40 px-4 py-3.5">Data i czas</th><th className="w-52 px-4 py-3.5">Użytkownik</th><th className="w-36 px-4 py-3.5">Operacja</th><th className="w-48 px-4 py-3.5">Encja</th><th className="w-52 px-4 py-3.5">Pole</th><th className="px-4 py-3.5">Poprzednia wartość</th><th className="px-4 py-3.5">Nowa wartość</th></tr>
        </thead>
        {items.map((item) => <tbody key={item.id} className="border-b-2 border-slate-200 last:border-b-0">
          {item.changes.map((change, index) => <tr key={`${item.id}-${change.fieldName ?? index}`} className="align-top odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/40">
            {index === 0 && <>
              <td rowSpan={item.changes.length} className="border-r border-slate-100 px-4 py-4 font-semibold text-slate-700"><time dateTime={item.occurredAtUtc}>{dateFormatter.format(new Date(item.occurredAtUtc))}</time><span className="mt-1 block text-[11px] font-normal text-slate-400">ID: {item.id}</span></td>
              <td rowSpan={item.changes.length} className="border-r border-slate-100 px-4 py-4"><span className="font-semibold text-slate-800">{item.actorDisplayName}</span><span title={item.actorId} className="mt-1 block truncate text-[11px] text-slate-400">{item.actorId}</span></td>
              <td rowSpan={item.changes.length} className="border-r border-slate-100 px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${operationClass(item.operationType)}`}>{operationLabel(item.operationType)}</span></td>
              <td rowSpan={item.changes.length} className="border-r border-slate-100 px-4 py-4"><span className="font-semibold text-slate-800">{entityLabel(item.entityType)}</span>{item.entityId && <span title={item.entityId} className="mt-1 block truncate text-[11px] text-slate-400">{item.entityId}</span>}<span className="mt-2 block text-xs leading-5 text-slate-500">{item.description}</span></td>
            </>}
            <td className="border-r border-slate-100 px-4 py-4"><span className="font-semibold text-slate-800">{change.fieldDisplayName ?? '—'}</span>{change.fieldName && change.fieldName !== change.fieldDisplayName && <code className="mt-1 block break-all text-[11px] text-slate-400">{change.fieldName}</code>}</td>
            <td className="border-r border-slate-100 px-4 py-4 leading-6 text-slate-700"><ValueCell value={change.oldValue} /></td>
            <td className="px-4 py-4 leading-6 text-slate-700"><ValueCell value={change.newValue} /></td>
          </tr>)}
        </tbody>)}
      </table>
    </div>
  </div>
}
