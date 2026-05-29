import { useState, useRef, useEffect } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import type { PnlAdquirenciaRow, InsightsAdqRow } from '../types'
import { CardSkeleton } from './Skeleton'
import CollapsibleCard from './CollapsibleCard'

const fmtK = (v: number, d = 0) => {
  const a = Math.abs(v)
  if (a >= 1e9) return `${(v / 1e9).toFixed(d || 1)}B`
  if (a >= 1e6) return `${(v / 1e6).toFixed(d || 1)}M`
  if (a >= 1e3) return `${(v / 1e3).toFixed(d || 0)}K`
  return v.toFixed(d)
}
const fmtK2 = (v: number) => fmtK(v, 2)
const fmtR = (v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtMes = (m: string) => m && m.includes('-') ? m.split('-').reverse().join('/') : m
const p = (v: string | null | undefined) => parseFloat(v ?? '0') || 0

function MiniTooltip({ active, payload, label, pct = false }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-2 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{fmtMes(label)}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex justify-between gap-3">
          <span style={{ color: e.color ?? e.fill }}>{e.name}</span>
          <span className="font-mono">{pct ? fmtPct(e.value / 100) : fmtR(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

const RECEITA_METRICS = [
  { key: 'net_mdr',       name: 'Rcta. NetMDR',      color: '#00461e' },
  { key: 'pix_rcta',      name: 'Rcta. Pix',          color: '#00d700' },
  { key: 'net_rav',       name: 'Margem RAV',         color: '#007d00' },
  { key: 'gateway',       name: 'Rcta. Gateway',      color: '#5cb800' },
  { key: 'aluguel',       name: 'Rcta. Aluguel',      color: '#a5fa00' },
  { key: 'floating_conta',name: 'Rcta. Floating',     color: '#00b4b4' },
  { key: 'rcta_boleto',   name: 'Rcta. Boleto',       color: '#0066cc' },
  { key: 'rcta_antifraude',name: 'Rcta. Antifraude',  color: '#9900cc' },
  { key: 'rcta_transf',   name: 'Rcta. Transferência',color: '#e06600' },
  { key: 'rcta_setup',    name: 'Rcta. Setup',        color: '#cc0044' },
]

function MonthFilter({ months, selected, onChange }: {
  months: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (m: string) => {
    const next = new Set(selected)
    next.has(m) ? next.delete(m) : next.add(m)
    if (next.size > 0) onChange(next)
  }
  const allOn = selected.size === months.length
  const toggleAll = () => onChange(new Set(allOn ? [] : months))

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] px-2.5 py-1 border border-[#c8d2c8] rounded-full hover:bg-[#f5fff5] text-[#505a50] flex items-center gap-1"
      >
        Meses {selected.size < months.length && <span className="bg-amber-100 text-amber-700 px-1 rounded-full text-[10px] font-semibold">{selected.size}/{months.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg p-2 w-36 max-h-64 overflow-y-auto">
          <button onClick={toggleAll} className="text-[10px] text-[#00461e] hover:underline mb-1 w-full text-left">
            {allOn ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
          {[...months].sort((a, b) => b.localeCompare(a)).map(m => (
            <label key={m} className="flex items-center gap-1.5 py-0.5 cursor-pointer hover:bg-gray-50 px-1 rounded">
              <input type="checkbox" checked={selected.has(m)} onChange={() => toggle(m)} className="accent-[#00461e]" />
              <span className="text-[11px] text-gray-700">{fmtMes(m)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  pnl: PnlAdquirenciaRow[] | null
  pnlStatus: string
  insights: InsightsAdqRow[] | null
  insightsStatus: string
  defaultOpen?: boolean
}

export default function InsightsAdq({ pnl, pnlStatus, insights, insightsStatus, defaultOpen = false }: Props) {
  const isLoading = pnlStatus === 'loading' || insightsStatus === 'loading'
  const hasData = (pnl && pnl.length > 0) || (insights && insights.length > 0)

  // Todos os meses disponíveis (union de pnl + insights)
  const allMonths: string[] = (() => {
    const s = new Set<string>()
    if (pnl) pnl.forEach(r => s.add(r.mes))
    if (insights) insights.forEach(r => s.add(r.mes))
    return Array.from(s).sort()
  })()

  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set(allMonths))

  // Sincronizar quando os dados chegam (inicializa com todos os meses)
  useEffect(() => {
    if (allMonths.length > 0) setSelectedMonths(new Set(allMonths))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMonths.join(',')])

  const active = selectedMonths.size > 0 ? selectedMonths : new Set(allMonths)

  const [focusedSerie, setFocusedSerie] = useState<string | null>(null)
  const lh = {
    onMouseEnter: (e: any) => setFocusedSerie(e.value),
    onMouseLeave: () => setFocusedSerie(null),
  }
  const op = (name: string) => focusedSerie && focusedSerie !== name ? 0.15 : 1

  // Rótulo condicional: aparece só quando a série está em foco
  const barFocusLabel = (name: string, fmtFn = fmtK, fill = 'white') =>
    focusedSerie !== name ? undefined : {
      content: ({ x, y, width, height, value }: any) => {
        if (!value) return null
        const v = fmtFn(typeof value === 'number' ? value : parseFloat(value))
        if (!v || v === '0') return null
        return <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill={fill} fontSize={9} fontWeight={600}>{v}</text>
      }
    }

  const lineFocusLabel = (name: string, color: string) =>
    focusedSerie !== name ? undefined : { formatter: fmtK, position: 'top' as const, fontSize: 9, fill: color }

  const axisProps = { tick: { fontSize: 10 }, interval: 'preserveStartEnd' as const }
  const zeroLine = <ReferenceLine y={0} stroke="#bbb" strokeDasharray="4 3" strokeWidth={1} />

  if (isLoading) return (
    <CollapsibleCard title="Adquirencia: Insights" defaultOpen={defaultOpen}><CardSkeleton /></CollapsibleCard>
  )
  if (!hasData) return (
    <CollapsibleCard title="Adquirencia: Insights" defaultOpen={defaultOpen}>
      <p className="text-gray-400 text-sm">Sem dados</p>
    </CollapsibleCard>
  )

  // Dados filtrados por meses selecionados, em ordem ASC
  const pnlFiltered = pnl ? [...pnl].filter(r => active.has(r.mes)).reverse() : []
  const insFiltered = insights ? [...insights].filter(r => active.has(r.mes)).reverse() : []

  // 1 — TPV Performado (+ linha CTPV total)
  const tpvData = insFiltered.map(r => ({
    mes: r.mes,
    cartao: p(r.tpv_cartao),
    pix: p(r.tpv_pix),
    total: p(r.tpv_cartao) + p(r.tpv_pix),
  }))

  // 2 — Margem Global
  const margemData = pnlFiltered.map(r => ({
    mes: r.mes,
    receita_ncof: p(r.receita_net_cof),
    cogs: p(r.cogs),
    margem: p(r.margem),
  }))

  // 3 — Linhas de Receita (apenas métricas com algum valor não-zero)
  const receitaData = pnlFiltered.map(r => {
    const row: Record<string, number | string> = { mes: r.mes, receita_ncof: p(r.receita_net_cof) }
    RECEITA_METRICS.forEach(m => { row[m.key] = p((r as any)[m.key]) })
    return row
  })
  const activeMetrics = RECEITA_METRICS.filter(m =>
    receitaData.some(row => (row[m.key] as number) !== 0)
  )

  // 4 — Share Performado (normalizado para somar exatamente 100)
  const shareData = insFiltered.map(r => {
    const raw = [p(r.tpv_debito), p(r.tpv_cred_avista), p(r.tpv_psj1), p(r.tpv_psj2), p(r.tpv_psj3)]
    const total = raw.reduce((a, b) => a + b, 0)
    if (total === 0) return { mes: r.mes, debito: 0, avista: 0, psj1: 0, psj2: 0, psj3: 0 }
    const vals = raw.map(v => Math.round(v / total * 100))
    const diff = 100 - vals.reduce((a, b) => a + b, 0)
    if (diff !== 0) vals[vals.indexOf(Math.max(...vals))] += diff
    const [debito, avista, psj1, psj2, psj3] = vals
    return { mes: r.mes, debito, avista, psj1, psj2, psj3 }
  })

  return (
    <CollapsibleCard
      title="Adquirencia: Insights"
      defaultOpen={defaultOpen}
      headerRight={allMonths.length > 0 ? (
        <MonthFilter months={allMonths} selected={active} onChange={setSelectedMonths} />
      ) : undefined}
    >
      <p className="text-[10px] text-[#96a096] mb-4 italic">Passe o mouse na legenda para destacar uma métrica</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1 — TPV Performado */}
        <div>
          <p className="text-xs font-semibold text-[#505a50] uppercase tracking-wide mb-3">TPV Performado</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={tpvData} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
              <XAxis dataKey="mes" tickFormatter={fmtMes} {...axisProps} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
              <Tooltip content={<MiniTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} {...lh} payload={[
                { value: 'TPV', type: 'line', color: '#000' },
                { value: 'Cartão', type: 'square', color: '#00461e' },
                { value: 'PIX', type: 'square', color: '#00d700' },
              ]} />
              <Bar dataKey="cartao" name="Cartão" stackId="a" fill="#00461e" opacity={op('Cartão')} label={barFocusLabel('Cartão')} />
              <Bar dataKey="pix" name="PIX" stackId="a" fill="#00d700" radius={[0, 0, 0, 0]} opacity={op('PIX')} label={barFocusLabel('PIX', fmtK, '#00461e')} />
              <Line
                dataKey="total" name="TPV" stroke="#000" strokeWidth={2}
                dot={{ r: 2, fill: '#000' }} opacity={op('TPV')}
                label={{ formatter: fmtK2, position: 'top', fontSize: 9, fill: '#222' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 2 — Margem Global Adquirência */}
        <div>
          <p className="text-xs font-semibold text-[#505a50] uppercase tracking-wide mb-3">Margem Global Adquirencia</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={margemData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
              <XAxis dataKey="mes" tickFormatter={fmtMes} {...axisProps} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
              <Tooltip content={<MiniTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} {...lh} />
              {zeroLine}
              <Bar dataKey="cogs" name="COGs" fill="#d70000" radius={[3, 3, 0, 0]} opacity={op('COGs')} label={barFocusLabel('COGs')} />
              <Line dataKey="receita_ncof" name="Receita nCOF" stroke="#00461e" strokeWidth={2} dot={false} opacity={op('Receita nCOF')}
                label={lineFocusLabel('Receita nCOF', '#00461e')} />
              <Line dataKey="margem" name="Margem" stroke="#00d700" strokeWidth={2} strokeDasharray="5 3"
                dot={{ r: 2, fill: '#00d700' }} opacity={op('Margem')}
                label={{ formatter: fmtK, position: 'top', fontSize: 9, fill: '#007d00' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 3 — Linhas de Receita */}
        <div>
          <p className="text-xs font-semibold text-[#505a50] uppercase tracking-wide mb-3">Linhas de Receita</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={receitaData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
              <XAxis dataKey="mes" tickFormatter={fmtMes} {...axisProps} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
              <Tooltip content={<MiniTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} {...lh} payload={[
                { value: 'Receita nCOF', type: 'line', color: '#000' },
                ...activeMetrics.map(m => ({ value: m.name, type: 'square' as const, color: m.color })),
              ]} />
              {zeroLine}
              {activeMetrics.map((m, i) => (
                <Bar key={m.key} dataKey={m.key} name={m.name} stackId="a" fill={m.color}
                  opacity={op(m.name)}
                  radius={i === activeMetrics.length - 1 ? [3, 3, 0, 0] : undefined}
                  label={barFocusLabel(m.name, fmtK, ['#a5fa00','#d2f57d','#5cb800'].includes(m.color) ? '#1e281e' : 'white')}
                />
              ))}
              <Line dataKey="receita_ncof" name="Receita nCOF" stroke="#000" strokeWidth={2}
                dot={{ r: 2, fill: '#000' }} opacity={op('Receita nCOF')}
                label={{ formatter: fmtK, position: 'top', fontSize: 9, fill: '#222' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 4 — Share Performado */}
        <div>
          <p className="text-xs font-semibold text-[#505a50] uppercase tracking-wide mb-3">Share CTPV Performado (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={shareData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
              <XAxis dataKey="mes" tickFormatter={fmtMes} {...axisProps} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip content={<MiniTooltip pct />} />
              <Legend wrapperStyle={{ fontSize: 10 }} {...lh} />
              {([
                { key: 'debito', name: 'Débito', color: '#00461e' },
                { key: 'avista', name: 'Cred. a Vista', color: '#007d00' },
                { key: 'psj1', name: 'PSJ1 (2-6x)', color: '#00d700' },
                { key: 'psj2', name: 'PSJ2 (7-12x)', color: '#a5fa00' },
                { key: 'psj3', name: 'PSJ3 (13+)', color: '#d2f57d' },
              ] as const).map((s, i, arr) => (
                <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color}
                  isAnimationActive={false}
                  opacity={op(s.name)} radius={i === arr.length - 1 ? [3, 3, 0, 0] : undefined}
                  label={{ content: (p: any) => {
                    const { x, y, width, height, index } = p
                    const segValue = (shareData[index] as any)?.[s.key] as number
                    const focused = focusedSerie === s.name
                    if (!segValue || (!focused && segValue < 3)) return null
                    const fill = ['#a5fa00','#d2f57d'].includes(s.color) ? '#1e281e' : 'white'
                    return <text key={`lbl-${s.key}-${index}`} x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill={fill} fontSize={9} fontWeight={600}>{segValue}%</text>
                  }}}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>
    </CollapsibleCard>
  )
}
