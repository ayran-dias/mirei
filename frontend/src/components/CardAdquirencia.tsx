import { useState, useRef, useEffect } from 'react'
import type { PnlAdquirenciaRow } from '../types'
import { TableSkeleton } from './Skeleton'
import CollapsibleCard from './CollapsibleCard'

const fmtN = (v: string | null) => {
  if (!v || v === 'null') return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const fmtPct = (v: string | null) => {
  if (!v || v === 'null') return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return (n * 100).toFixed(2) + '%'
}

const cellColor = (v: string | null) => {
  if (!v || v === 'null') return ''
  const n = parseFloat(v)
  if (isNaN(n) || n === 0) return ''
  return n < 0 ? 'text-red-600' : ''
}

interface ColDef {
  key: string
  label: string
  format: 'num' | 'pct'
}

const ALL_COLS: ColDef[] = [
  { key: 'tpv', label: 'TPV', format: 'num' },
  { key: 'ctpv', label: 'CTPV', format: 'num' },
  { key: 'tpv_pix_vol', label: 'TPV Pix', format: 'num' },
  { key: 'delay_rcta', label: 'Delay (rcta)', format: 'num' },
  { key: 'delay_pct', label: 'Delay %', format: 'pct' },
  { key: 'net_mdr', label: 'NetMDR', format: 'num' },
  { key: 'pctg_net_mdr', label: 'NetMDR %', format: 'pct' },
  { key: 'floating_conta', label: 'Floating', format: 'num' },
  { key: 'floating_pct', label: 'Floating %', format: 'pct' },
  { key: 'aluguel', label: 'Aluguel', format: 'num' },
  { key: 'aluguel_pct', label: 'Aluguel %', format: 'pct' },
  { key: 'net_rav', label: 'NetRAV', format: 'num' },
  { key: 'rav_pct', label: 'RAV%', format: 'pct' },
  { key: 'rcta_ted', label: 'Rcta TED', format: 'num' },
  { key: 'pix_rcta', label: 'Pix (rcta)', format: 'num' },
  { key: 'gateway', label: 'Gateway', format: 'num' },
  { key: 'receita_net_cof', label: 'Rcta NetCOF', format: 'num' },
  { key: 'tkr_net_cof', label: 'TKR nCOF', format: 'pct' },
  { key: 'cogs', label: 'COGs', format: 'num' },
  { key: 'margem', label: 'Margem', format: 'num' },
  { key: 'margem_div_tpv', label: 'Margem %', format: 'pct' },
]

interface Props {
  data: PnlAdquirenciaRow[] | null
  status: string
  defaultOpen?: boolean
}

function ColumnFilter({ hiddenCols, setHiddenCols }: { hiddenCols: Set<string>; setHiddenCols: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (key: string) => {
    const next = new Set(hiddenCols)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setHiddenCols(next)
  }

  const visibleCount = ALL_COLS.length - hiddenCols.size

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-3 py-1.5 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Colunas ({visibleCount}/{ALL_COLS.length})
        {hiddenCols.size > 0 && (
          <span className="bg-amber-100 text-amber-700 px-1.5 rounded-full text-[10px] font-semibold">{hiddenCols.size} ocultas</span>
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg p-3 w-64 max-h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-600">Mostrar/ocultar colunas</span>
            <button
              onClick={() => setHiddenCols(new Set())}
              className="text-[10px] text-stone-green hover:underline"
            >
              Mostrar todas
            </button>
          </div>
          {ALL_COLS.map(col => (
            <label key={col.key} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 px-1 rounded">
              <input
                type="checkbox"
                checked={!hiddenCols.has(col.key)}
                onChange={() => toggle(col.key)}
                className="rounded border-gray-300 text-stone-600 focus:ring-stone-500"
              />
              <span className="text-xs text-gray-700">{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CardAdquirencia({ data, status, defaultOpen = false }: Props) {
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set(['rcta_ted', 'delay_pct', 'delay_rcta', 'ctpv', 'tpv_pix_vol']))

  if (status === 'loading') return (
    <CollapsibleCard title="Adquirência: Detalhado Mensal" defaultOpen={defaultOpen}><TableSkeleton rows={6} /></CollapsibleCard>
  )

  if (status === 'error' || !data || data.length === 0) return (
    <CollapsibleCard title="Adquirência: Detalhado Mensal" defaultOpen={defaultOpen}><p className="text-gray-400 text-sm">Sem dados</p></CollapsibleCard>
  )

  const visibleCols = ALL_COLS.filter(c => !hiddenCols.has(c.key))

  return (
    <CollapsibleCard
      title="Adquirência: Detalhado Mensal"
      defaultOpen={defaultOpen}
      headerRight={<ColumnFilter hiddenCols={hiddenCols} setHiddenCols={setHiddenCols} />}
    >
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-[#f5fff5] border-b border-[#c8d2c8]">
              <th className="px-3 py-2.5 text-left text-[#505a50] font-semibold sticky left-0 bg-[#f5fff5] z-10">Mes</th>
              {visibleCols.map(c => (
                <th key={c.key} className="px-2 py-2.5 text-right text-[#505a50] font-semibold">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-[#e8f0e8] hover:bg-[#f5fff5] transition-colors">
                <td className="px-3 py-2 font-medium text-[#1e281e] sticky left-0 bg-white z-10">{row.mes.split('-').reverse().join('/')}</td>
                {visibleCols.map(c => {
                  const val = (row as any)[c.key] as string | null
                  return (
                    <td
                      key={c.key}
                      className={`px-2 py-2 text-right font-mono ${cellColor(val)}`}
                    >
                      {c.format === 'pct' ? fmtPct(val) : fmtN(val)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleCard>
  )
}
