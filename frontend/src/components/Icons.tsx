import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement>
const base = { fill: 'none', viewBox: '0 0 24 24', strokeWidth: 1.8, stroke: 'currentColor', 'aria-hidden': true } as const

export const SearchIcon = (props: Props) => <svg {...base} {...props}><circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m20 20-4-4" /></svg>
export const RefreshIcon = (props: Props) => <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M20 5v6h-6m5.1-3A8 8 0 1 0 20 14" /></svg>
export const DownloadIcon = (props: Props) => <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" /></svg>
export const LogoutIcon = (props: Props) => <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5v12h5m4-3 3-3-3-3m3 3H9" /></svg>
export const FilterIcon = (props: Props) => <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" /></svg>
export const ContractIcon = (props: Props) => <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h8l4 4v14H7V3Zm8 0v5h4M10 12h6m-6 4h6" /></svg>
export const ChevronIcon = (props: Props) => <svg {...base} {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
