import {
  ArrowRight01Icon,
  Download01Icon,
  File01Icon,
  FilterIcon as FilterGlyph,
  Logout01Icon,
  RefreshIcon as RefreshGlyph,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'

type Props = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'>

const icon = (glyph: ComponentProps<typeof HugeiconsIcon>['icon']) =>
  (props: Props) => <HugeiconsIcon aria-hidden="true" icon={glyph} strokeWidth={1.8} {...props} />

export const SearchIcon = icon(Search01Icon)
export const ArrowRightIcon = icon(ArrowRight01Icon)
export const RefreshIcon = icon(RefreshGlyph)
export const DownloadIcon = icon(Download01Icon)
export const LogoutIcon = icon(Logout01Icon)
export const FilterIcon = icon(FilterGlyph)
export const ContractIcon = icon(File01Icon)
