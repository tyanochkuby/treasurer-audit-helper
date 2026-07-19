const utcDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i
const localFormatters = new Map<string, Intl.DateTimeFormat>()
const utcFormatters = new Map<string, Intl.DateTimeFormat>()

export function parseUtcDateTime(value: string) {
  if (!utcDateTimePattern.test(value)) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function localDateTimeFormatter(locale: string) {
  const cached = localFormatters.get(locale)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Europe/Warsaw',
  })
  localFormatters.set(locale, formatter)
  return formatter
}

export function utcDateTimeFormatter(locale: string) {
  const cached = utcFormatters.get(locale)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
  utcFormatters.set(locale, formatter)
  return formatter
}
