import { useState } from 'react'

interface Props {
  title: string
  color?: 'green' | 'blue'
  headerRight?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function CollapsibleCard({ title, color = 'green', headerRight, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  // Lazy mount: children só montam na primeira abertura e ficam montados depois
  const [mounted, setMounted] = useState(defaultOpen)
  const accent = color === 'blue' ? 'border-l-[#00d700]' : 'border-l-[#00461e]'

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && !mounted) setMounted(true)
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-[#c8d2c8] border-l-4 ${accent} overflow-hidden`}>
      <button
        type="button"
        onClick={toggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#f5fff5] transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-[#00461e]/50 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-0' : '-rotate-90'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className="font-bold text-[#00461e] text-sm tracking-wide">{title}</h3>
        </div>
        {headerRight && <div onClick={e => e.stopPropagation()}>{headerRight}</div>}
      </button>
      {/* Mounted uma vez, oculto quando fechado — preserva dados sem re-fetch */}
      {mounted && (
        <div className={`border-t border-[#e8f0e8] ${open ? '' : 'hidden'}`}>
          <div className="px-6 pb-6 pt-1">{children}</div>
        </div>
      )}
    </div>
  )
}
