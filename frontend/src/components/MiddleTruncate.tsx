interface Props {
  value: string
  endLength?: number
  className?: string
}

export function MiddleTruncate({ value, endLength = 18, className = '' }: Props) {
  const preservedEndLength = Math.min(endLength, Math.floor(value.length / 2))
  const targetSplitIndex = value.length - preservedEndLength
  const splitIndex = findTightSplitIndex(value, targetSplitIndex)
  const start = preservedEndLength > 0 ? value.slice(0, splitIndex) : value
  const end = preservedEndLength > 0 ? value.slice(splitIndex) : ''

  return <span title={value} className={`flex min-w-0 max-w-full whitespace-nowrap ${className}`}>
    <span className="min-w-0 truncate">{start}</span>
    {end && <span className="shrink-0">{end}</span>}
  </span>
}

function findTightSplitIndex(value: string, target: number) {
  const isTightBoundary = (index: number) => index > 0
    && index < value.length
    && !/\s/u.test(value[index - 1])
    && !/\s/u.test(value[index])

  for (let distance = 0; distance < value.length; distance += 1) {
    const before = target - distance
    if (isTightBoundary(before)) return before

    const after = target + distance
    if (after !== before && isTightBoundary(after)) return after
  }

  return target
}
