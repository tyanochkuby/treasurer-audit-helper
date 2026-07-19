import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatJsonValue, type JsonDiffData } from '../jsonDiffModel'
import { AuditValue } from './AuditValue'

export function JsonDiff({ data }: { data: JsonDiffData }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return <div className="w-full">
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full border border-[#E5E9F0] bg-slate-50 px-3 py-1 text-[13px] font-medium text-slate-600">{t('table.jsonDiffSummary', { count: data.changes.length })}</span>
      <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-sm text-sm font-semibold text-brand-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue" aria-expanded={expanded}>{expanded ? t('table.hideJsonDiff') : t('table.showJsonDiff')}</button>
    </div>

    {expanded && <div className="mt-3 overflow-hidden rounded-lg border border-[#E5E9F0] bg-white font-mono text-[13px]">
      {data.changes.map((change) => <div key={change.path} className="grid gap-2 border-b border-[#E5E9F0] px-4 py-3 last:border-b-0 md:grid-cols-[minmax(12rem,35%)_minmax(0,1fr)]">
        <code className="break-all text-slate-500">{change.path}</code>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <AuditValue value={change.oldValue === undefined ? null : formatJsonValue(change.oldValue)} variant="old" jsonLiteral />
          <span className="text-[#B0B7C3]" aria-hidden="true">→</span>
          <AuditValue value={change.newValue === undefined ? null : formatJsonValue(change.newValue)} variant="new" jsonLiteral />
        </div>
      </div>)}
    </div>}
  </div>
}
