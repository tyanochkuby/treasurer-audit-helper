import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localDateTimeFormatter, parseUtcDateTime, utcDateTimeFormatter } from '../dateTime'

export type ValueVariant = 'old' | 'new' | 'plain'

function valueClass(variant: ValueVariant) {
  if (variant === 'old') return 'rounded-[6px] bg-[#FEF1F1] px-2 py-0.5 text-[13px] font-normal text-[#8A93A3] line-through'
  if (variant === 'new') return 'rounded-[6px] bg-[#EDF9F0] px-2 py-0.5 text-[15px] font-medium text-[#1F2937]'
  return 'text-[15px] font-medium text-[#1F2937]'
}

function parseJson(value: string): unknown | undefined {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

function isStructuredJson(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === 'object'
}

function JsonTree({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <ul className="ml-4 border-l border-slate-200 pl-3">
    {value.map((child, index) => <li key={index} className="py-0.5"><code className="text-slate-500">[{index}]</code>: <JsonTreeValue value={child} /></li>)}
  </ul>
  if (value !== null && typeof value === 'object') return <ul className="ml-4 border-l border-slate-200 pl-3">
    {Object.entries(value).map(([key, child]) => <li key={key} className="py-0.5"><code className="text-slate-500">{key}</code>: <JsonTreeValue value={child} /></li>)}
  </ul>
  return <JsonTreeValue value={value} />
}

function DateTimeValue({ date, className }: { date: Date; className?: string }) {
  const { i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  return <time dateTime={date.toISOString()} title={utcDateTimeFormatter(locale).format(date)} className={className}>{localDateTimeFormatter(locale).format(date)}</time>
}

function JsonSummary({ value }: { value: Record<string, unknown> | unknown[] }) {
  const { t } = useTranslation()
  return <>{Array.isArray(value) ? t('table.jsonArray', { count: value.length }) : t('table.jsonObject', { count: Object.keys(value).length })}</>
}

function JsonTreeValue({ value }: { value: unknown }) {
  const date = typeof value === 'string' ? parseUtcDateTime(value) : null
  if (date) return <DateTimeValue date={date} />
  if (isStructuredJson(value)) return <details className="inline-block align-top"><summary className="cursor-pointer text-brand-blue"><JsonSummary value={value} /></summary><JsonTree value={value} /></details>
  return <code>{JSON.stringify(value)}</code>
}

function StructuredJsonValue({ value }: { value: Record<string, unknown> | unknown[] }) {
  return <details className="max-w-full font-mono text-[13px] text-[#1F2937]"><summary className="cursor-pointer font-sans text-sm font-bold text-brand-blue"><JsonSummary value={value} /></summary><div className="mt-2 rounded-md bg-slate-50 p-3"><JsonTree value={value} /></div></details>
}

export function AuditValue({ value, variant, jsonLiteral = false }: { value: string | null; variant: ValueVariant; jsonLiteral?: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if (value === null || value === '') return <span className="text-[15px] text-[#B0B7C3]">—</span>

  const parsed = parseJson(value)
  const structuredJson = isStructuredJson(parsed)
  const dateValue = jsonLiteral && typeof parsed === 'string' ? parsed : value
  const date = !structuredJson && typeof dateValue === 'string' ? parseUtcDateTime(dateValue) : null

  if (structuredJson) return <StructuredJsonValue value={parsed} />
  if (date) return <DateTimeValue date={date} className={valueClass(variant)} />

  const isLong = value.length > 90 || value.includes('\n')
  if (!isLong) return <span className={`max-w-full break-words [overflow-wrap:anywhere] ${valueClass(variant)}`}>{value}</span>
  return <div className="max-w-full">
    <span className={`max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${valueClass(variant)}`}>{expanded ? value : `${value.slice(0, 72)}…`}</span>{' '}
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} className="text-xs font-bold text-brand-blue hover:underline">{expanded ? t('table.hideAll') : t('table.showAll')}</button>
  </div>
}
