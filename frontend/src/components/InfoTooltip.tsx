import { useState, useRef, useEffect } from 'react'

declare const window: Window & {
  google?: { script?: { history?: { push: (s: null, p: Record<string, string>, h: string) => void } } }
}

interface NavLink { label: string; page: string }

interface Props {
  lines?: string[]
  navLinks?: NavLink[]
  variant?: 'dark' | 'light'
}

export default function InfoTooltip({ lines = [], navLinks, variant = 'dark' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navigate = (page: string) => {
    try { window.google?.script?.history?.push(null, { page }, '') } catch (_) {}
    setOpen(false)
  }

  const btnCls = variant === 'light'
    ? 'w-5 h-5 rounded-full border border-[#00461e]/30 text-[#00461e]/50 hover:text-[#00461e] hover:border-[#00461e]/60 flex items-center justify-center text-xs font-semibold transition-colors'
    : 'w-5 h-5 rounded-full border border-white/40 text-white/70 hover:text-white hover:border-white/70 flex items-center justify-center text-xs font-semibold transition-colors'

  const hasContent = lines.length > 0 || (navLinks && navLinks.length > 0)
  if (!hasContent) return null

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(!open)} className={btnCls}>?</button>
      {open && (
        <div className="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-64">
          {lines.length > 0 && (
            <div className="space-y-2">
              {lines.map((line, i) => {
                const [label, ...rest] = line.split(':')
                const desc = rest.join(':').trim()
                return desc ? (
                  <div key={i}>
                    <span className="font-semibold text-xs text-gray-800">{label.trim()}</span>
                    <span className="text-xs text-gray-500">: {desc}</span>
                  </div>
                ) : (
                  <p key={i} className="text-xs text-gray-500">{line}</p>
                )
              })}
            </div>
          )}
          {lines.length > 0 && navLinks && navLinks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100" />
          )}
          {navLinks && navLinks.length > 0 && (
            <div className="space-y-1.5">
              {navLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={() => navigate(link.page)}
                  className="w-full text-left text-xs font-semibold text-[#1D9E75] hover:text-[#148a60] flex items-center gap-1.5 py-0.5 transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
