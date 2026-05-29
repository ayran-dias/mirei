import { useState, useRef, useEffect } from 'react'

interface Props {
  lines: string[]
}

export default function InfoTooltip({ lines }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-5 h-5 rounded-full border border-white/40 text-white/70 hover:text-white hover:border-white/70 flex items-center justify-center text-xs font-semibold transition-colors"
      >
        ?
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72">
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
        </div>
      )}
    </div>
  )
}
