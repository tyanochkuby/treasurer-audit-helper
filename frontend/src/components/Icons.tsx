import {
  Copy01Icon,
  ArrowRight01Icon,
  Download01Icon,
  File01Icon,
  FilterIcon as FilterGlyph,
  Logout01Icon,
  Menu01Icon,
  RefreshIcon as RefreshGlyph,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps, SVGProps } from 'react'

type Props = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'>
type Glyph = ComponentProps<typeof HugeiconsIcon>['icon']

function Icon({ glyph, ...props }: Props & { glyph: Glyph }) {
  return <HugeiconsIcon aria-hidden="true" icon={glyph} strokeWidth={1.8} {...props} />
}

export function SearchIcon(props: Props) { return <Icon glyph={Search01Icon} {...props} /> }
export function CopyIcon(props: Props) { return <Icon glyph={Copy01Icon} {...props} /> }
export function ChevronIcon(props: Props) { return <Icon glyph={ArrowRight01Icon} {...props} /> }
export function RefreshIcon(props: Props) { return <Icon glyph={RefreshGlyph} {...props} /> }
export function DownloadIcon(props: Props) { return <Icon glyph={Download01Icon} {...props} /> }
export function LogoutIcon(props: Props) { return <Icon glyph={Logout01Icon} {...props} /> }
export function MenuIcon(props: Props) { return <Icon glyph={Menu01Icon} {...props} /> }
export function FilterIcon(props: Props) { return <Icon glyph={FilterGlyph} {...props} /> }
export function ContractIcon(props: Props) { return <Icon glyph={File01Icon} {...props} /> }

type SvgIconProps = SVGProps<SVGSVGElement>

export function ExpandAllIcon(props: SvgIconProps) {
  return <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" {...props}>
    <path d="M5.25 4 8 1.25 10.75 4M8 1.5v4M5.25 12 8 14.75 10.75 12M8 14.5v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.1 3" />
  </svg>
}

export function CollapseAllIcon(props: SvgIconProps) {
  return <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" {...props}>
    <path d="m5.25 3.5 2.75 2.75 2.75-2.75M8 1.5v4.5M5.25 12.5 8 9.75l2.75 2.75M8 14.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="0.1 3" />
  </svg>
}
