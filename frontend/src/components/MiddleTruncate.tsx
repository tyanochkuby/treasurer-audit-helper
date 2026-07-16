interface Props {
  value: string
  endLength?: number
  className?: string
}

export function MiddleTruncate({ value, endLength = 18, className = '' }: Props) {
  const split = value.length > endLength * 2
  const start = split ? value.slice(0, -endLength) : value
  const end = split ? value.slice(-endLength) : ''

  return <span title={value} className={`flex min-w-0 max-w-full whitespace-nowrap ${className}`}>
    <span className="min-w-0 truncate">{start}</span>
    {end && <span className="shrink-0">{end}</span>}
  </span>
}
