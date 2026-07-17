interface Props {
  value: string
  endLength?: number
  className?: string
}

export function MiddleTruncate({ value, endLength = 18, className = '' }: Props) {
  const preservedEndLength = Math.min(endLength, Math.floor(value.length / 2))
  const start = preservedEndLength > 0 ? value.slice(0, -preservedEndLength) : value
  const end = preservedEndLength > 0 ? value.slice(-preservedEndLength) : ''

  return <span title={value} className={`flex min-w-0 max-w-full whitespace-nowrap ${className}`}>
    <span className="min-w-0 truncate">{start}</span>
    {end && <span className="shrink-0">{end}</span>}
  </span>
}
