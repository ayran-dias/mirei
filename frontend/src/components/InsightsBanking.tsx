import { useState, useRef, useEffect } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList
} from 'recharts'
import type { BancoHistoricoRow } from '../types'
import { CardSkeleton } from './Skeleton'
import CollapsibleCard from './CollapsibleCard'
import InfoTooltip from './InfoTooltip'

const F360_NAV = [{ label: 'Documentação →', page: 'doc-felicia360' }]

// ── Formatadores ─────────────────────────────────────────────────
const fmtK = (v: number, d = 0) => {
  const a = Math.abs(v)
  const loc = (n: number, decimals: number) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  if (a >= 1e9) return `${loc(v / 1e9, d || 1)}B`
  if (a >= 1e6) return `${loc(v / 1e6, d || 1)}M`
  if (a >= 1e3) return `${loc(v / 1e3, d || 0)}K`
  return loc(v, d)
}
const fmtK2 = (v: number) => fmtK(v, 2)
const fmtR = (v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
const fmtMes = (m: string) => m && m.includes('-') ? m.split('-').reverse().join('/') : m
const p = (v: string | null | undefined) => parseFloat(v ?? '0') || 0

// ── Métricas de receita (paleta Stone — verdes) ───────────────────
const RECEITA_METRICS = [
  { key: 'receita_seguros',              name: 'Seguros',                    color: '#00461e' },
  { key: 'receita_floating_sweep',       name: 'Floating Raspa-Conta',       color: '#00d700' },
  { key: 'receita_floating_conta_reserva', name: 'Floating Conta+Reserva',   color: '#007d00' },
  { key: 'receita_pix_pos',              name: 'PIX POS',                    color: '#5cb800' },
  { key: 'receita_interchange_cartao',   name: 'Interchange Cartão',         color: '#a5fa00' },
  { key: 'receita_cartao',               name: 'Receita Cartão',             color: '#00b4b4' },
  { key: 'receita_floating_delayed',     name: 'Taxas Inteligentes',         color: '#0066cc' },
  { key: 'receita_movimentacao',         name: 'Movimentação (TED/PIX/Saque)', color: '#9900cc' },
  { key: 'receita_boleto',               name: 'Boleto',                     color: '#005c00' },
  { key: 'receita_juros_rotativo',       name: 'Juros Rotativo',             color: '#003d00' },
  { key: 'receita_outros_cartao',        name: 'Outros Cartão',              color: '#1D9E75' },
  { key: 'receita_outros_banking',       name: 'Outros Banking',             color: '#c7ff3d' },
]

// ── Saldos médios (gráfico de linhas) ────────────────────────────
const SALDO_METRICS = [
  { key: 'media_saldo_conta_visao_cliente', name: 'Saldo Conta',    color: '#00461e' },
  { key: 'media_saldo_reservas',            name: 'Saldo Reservas', color: '#007d00' },
]

// ── Tooltip inline ────────────────────────────────────────────────
function MiniTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-2 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{fmtMes(label)}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex justify-between gap-3">
          <span style={{ color: e.color ?? e.fill }}>{e.name}</span>
          <span className="font-sans">{fmtR(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Filtro de meses ───────────────────────────────────────────────
function MonthFilter({ months, selected, onChange }: {
  months: string[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
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
        Meses{selected.size < months.length && (
          <span className="bg-amber-100 text-amber-700 px-1 rounded-full text-[10px] font-semibold">
            {selected.size}/{months.length}
          </span>
        )}
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

// ── Filtro de métricas (pills) ────────────────────────────────────
function MetricFilter({ metrics, hidden, onChange }: {
  metrics: typeof RECEITA_METRICS
  hidden: Set<string>
  onChange: (s: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (key: string) => {
    const next = new Set(hidden)
    if (next.has(key)) next.delete(key); else next.add(key)
    onChange(next)
  }
  const visibleCount = metrics.length - hidden.size

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[10px] font-semibold px-2 py-0.5 rounded border border-[#00461e]/30 text-[#00461e] hover:bg-[#f0faf5] transition-colors flex items-center gap-1"
      >
        Métricas{hidden.size > 0 ? ` (${visibleCount}/${metrics.length})` : ''}
        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-52 space-y-0.5">
          {metrics.map(m => (
            <label key={m.key} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 px-1 rounded">
              <input
                type="checkbox"
                checked={!hidden.has(m.key)}
                onChange={() => toggle(m.key)}
                className="accent-[#00461e]"
              />
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
              <span className="text-[11px] text-gray-700">{m.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────
interface Props {
  data: BancoHistoricoRow[] | null
  status: string
  selectedCompanies?: string[]
  defaultOpen?: boolean
}

// ── Componente principal ──────────────────────────────────────────
export default function InsightsBanking({ data, status, selectedCompanies, defaultOpen = false }: Props) {
  const isLoading = status === 'loading'
  const hasData = data && data.length > 0

  const allMonths: string[] = (() => {
    const s = new Set<string>()
    if (data) data.forEach(r => s.add(r.mes))
    return Array.from(s).sort()
  })()

  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set(allMonths))
  const [showLinhas, setShowLinhas] = useState(true)
  const [showSaldos, setShowSaldos] = useState(true)
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set())

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

  const barFocusLabel = (name: string, fmtFn = fmtK, fill = 'white') =>
    focusedSerie !== name ? undefined : {
      content: ({ x, y, width, height, value }: any) => {
        if (!value) return null
        const v = fmtFn(typeof value === 'number' ? value : parseFloat(value))
        if (!v || v === '0') return null
        return (
          <text
            x={x + width / 2} y={y + height / 2 + 4}
            textAnchor="middle" fill={fill} fontSize={9} fontWeight={600}
          >
            {v}
          </text>
        )
      }
    }

  const lineFocusLabel = (name: string, color: string) =>
    focusedSerie !== name ? undefined : {
      formatter: fmtK,
      position: 'top' as const,
      fontSize: 9,
      fill: color,
    }

  const axisProps = { tick: { fontSize: 10 }, interval: 'preserveStartEnd' as const }
  const zeroLine = <ReferenceLine y={0} stroke="#bbb" strokeDasharray="4 3" strokeWidth={1} />

  if (isLoading) return (
    <CollapsibleCard title="Banking: Insights" defaultOpen={defaultOpen}>
      <CardSkeleton />
    </CollapsibleCard>
  )
  if (!hasData) return (
    <CollapsibleCard title="Banking: Insights" defaultOpen={defaultOpen}>
      <p className="text-gray-400 text-sm">Sem dados</p>
    </CollapsibleCard>
  )

  // Dados filtrados ordenados ASC
  const filtered = [...data].filter(r => active.has(r.mes)).sort((a, b) => a.mes.localeCompare(b.mes))

  // 1 — Dados para gráfico de receitas
  const receitaData = filtered.map(r => {
    const row: Record<string, number | string> = {
      mes: r.mes,
      receita_total: RECEITA_METRICS.reduce((acc, m) => acc + p((r as any)[m.key]), 0),
    }
    RECEITA_METRICS.forEach(m => { row[m.key] = p((r as any)[m.key]) })
    return row
  })

  // Métricas com pelo menos um valor não-zero
  const activeMetrics = RECEITA_METRICS.filter(m =>
    receitaData.some(row => (row[m.key] as number) !== 0)
  )
  const visibleMetrics = activeMetrics.filter(m => !hiddenMetrics.has(m.key))

  // 2 — Dados para gráfico de saldos
  const saldoData = filtered.map(r => ({
    mes: r.mes,
    media_saldo_conta_visao_cliente: p(r.media_saldo_conta_visao_cliente),
    media_saldo_reservas: p(r.media_saldo_reservas),
  }))

  return (
    <CollapsibleCard
      title="Banking: Insights"
      defaultOpen={defaultOpen}
      headerRight={
        <div className="flex items-center gap-2">
          {/* Badge dinâmico: mostra quais empresas estão selecionadas no filtro */}
          {(() => {
            const allCo = !selectedCompanies || selectedCompanies.length === 2
            const label = allCo ? 'Stone + Pagar.me' : selectedCompanies!.join(' + ')
            const title = allCo
              ? 'Receitas de banking consolidadas (Stone + Pagar.me). Saldos e boletos são por conta (sempre consolidados).'
              : `Receitas de banking filtradas por ${label}. Saldos e boletos são por conta (sempre consolidados).`
            return (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium border border-gray-200"
                title={title}
              >
                {label}
              </span>
            )
          })()}
          {allMonths.length > 0 && (
            <MonthFilter months={allMonths} selected={active} onChange={setSelectedMonths} />
          )}
          <InfoTooltip navLinks={F360_NAV} variant="light" />
        </div>
      }
    >
      <p className="text-[10px] text-[#96a096] mb-4 italic">Passe o mouse na legenda para destacar uma métrica</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1 — Linhas de Receita Banking */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#505a50] uppercase tracking-wide">
              Linhas de Receita Banking
            </p>
            <div className="flex items-center gap-1.5">
              {showLinhas && activeMetrics.length > 0 && (
                <MetricFilter metrics={activeMetrics} hidden={hiddenMetrics} onChange={setHiddenMetrics} />
              )}
              <button
                onClick={() => setShowLinhas(s => !s)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
              >
                {showLinhas ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>
          {showLinhas && (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={receitaData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
                <XAxis dataKey="mes" tickFormatter={fmtMes} {...axisProps} />
                <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 10 }} />
                <Tooltip content={<MiniTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} {...lh} payload={[
                  { value: 'Total Receita', type: 'line', color: '#000' },
                  ...visibleMetrics.map(m => ({ value: m.name, type: 'square' as const, color: m.color })),
                ]} />
                {zeroLine}
                {visibleMetrics.map((m, i) => (
                  <Bar
                    key={m.key}
                    dataKey={m.key}
                    name={m.name}
                    stackId="a"
                    fill={m.color}
                    opacity={op(m.name)}
                    radius={i === visibleMetrics.length - 1 ? [3, 3, 0, 0] : undefined}
                    label={barFocusLabel(m.name, fmtK, 'white')}
                  />
                ))}
                <Line
                  dataKey="receita_total"
                  name="Total Receita"
                  stroke="#000"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#000' }}
                  opacity={op('Total Receita')}
                  label={{ formatter: fmtK2, position: 'top', fontSize: 9, fill: '#222' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 2 — Saldos Médios */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#505a50] uppercase tracking-wide">
              Saldos Médios
            </p>
            <button
              onClick={() => setShowSaldos(s => !s)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
            >
              {showSaldos ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {showSaldos && (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={saldoData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
                <XAxis dataKey="mes" tickFormatter={fmtMes} {...axisProps} />
                <YAxis tickFormatter={v => fmtK(v)} tick={{ fontSize: 10 }} />
                <Tooltip content={<MiniTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} {...lh} />
                {zeroLine}
                {SALDO_METRICS.map(s => (
                  <Line
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 2, fill: s.color }}
                    opacity={op(s.name)}
                    label={lineFocusLabel(s.name, s.color)}
                  >
                    {s.key === 'media_saldo_conta_visao_cliente' && (
                      <LabelList
                        dataKey={s.key}
                        position="top"
                        style={{ fontSize: 10, fill: '#6b7280' }}
                        formatter={(v: number) => {
                          if (!v && v !== 0) return ''
                          const abs = Math.abs(v)
                          if (abs >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
                          if (abs >= 1_000) return `R$${(v / 1_000).toFixed(0)}K`
                          return `R$${v.toFixed(0)}`
                        }}
                      />
                    )}
                  </Line>
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </CollapsibleCard>
  )
}
