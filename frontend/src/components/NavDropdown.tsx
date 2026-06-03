import { useState, useRef } from 'react'

interface NavItem {
  label: string
  page?: string        // página React a navegar (state-based)
  children?: NavItem[]
}

interface Props {
  label: string
  items?: NavItem[]
  onNavigate: (page: string) => void
}

function SubGroup({ item, onNavigate }: { item: NavItem; onNavigate: (page: string) => void }) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return (
    <div
      onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setOpen(true) }}
      onMouseLeave={() => { timeoutRef.current = setTimeout(() => setOpen(false), 150) }}
      className="relative"
    >
      <div className="flex items-center justify-between px-4 py-2 text-xs text-white/50 font-semibold tracking-wider cursor-default select-none hover:bg-white/5">
        {item.label}
        <svg className="w-3 h-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      {open && item.children && (
        <div className="absolute top-0 left-full ml-1 bg-[#00461e] border border-white/10 rounded-xl shadow-xl py-1.5 min-w-[160px] z-50">
          {item.children.map((child, j) => (
            <button
              key={j}
              onClick={() => child.page && onNavigate(child.page)}
              className="w-full text-left px-4 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NavDropdown({ label, items, onNavigate }: Props) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={() => !items?.length && onNavigate('home')}
        className="flex items-center gap-1 px-3 py-1.5 text-white/70 hover:text-white text-xs font-medium rounded-full hover:bg-white/10 transition-colors"
      >
        {label}
        {items && items.length > 0 && (
          <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && items && items.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-[#00461e] border border-white/10 rounded-xl shadow-xl py-1.5 min-w-[180px] z-50">
          {items.map((item, i) => (
            <div key={i}>
              {item.children ? (
                <SubGroup item={item} onNavigate={onNavigate} />
              ) : (
                <button
                  onClick={() => { item.page && onNavigate(item.page); setOpen(false) }}
                  className="w-full text-left px-4 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
