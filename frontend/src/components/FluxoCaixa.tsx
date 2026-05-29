import { useState, useMemo, useRef, useCallback } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Brush
} from 'recharts'
import type { PnlAdquirenciaRow, FluxoCreditoRow } from '../types'
import { CardSkeleton } from './Skeleton'
import CollapsibleCard from './CollapsibleCard'
import InfoTooltip from './InfoTooltip'

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

const LINES = [
  { key: 'receita_juros', name: 'Receita Juros (Cred)', color: '#93c5fd', group: 'credito', dashed: true },
  { key: 'nii_credito', name: 'NII (Cred)', color: '#3b82f6', group: 'credito', dashed: true },
  { key: 'risk_adj_nii', name: 'Risk Adj NII (Cred)', color: '#1e40af', group: 'credito', dashed: true },
  { key: 'net_cf', name: 'Net CF (Cred)', color: '#6d28d9', group: 'credito' },
  { key: 'receita_net_cof', name: 'Receita nCOF (Adq)', color: '#34d399', group: 'adquirencia', dashed: true },
  { key: 'margem_adq', name: 'Margem (Adq)', color: '#059669', group: 'adquirencia' },
] as const

interface Props {
  pnl: PnlAdquirenciaRow[] | null
  pnlStatus: string
  credito: FluxoCreditoRow[] | null
  creditoStatus: string
  defaultOpen?: boolean
}

interface ChartPoint {
  mes: string
  receita_juros?: number
  nii_credito?: number
  risk_adj_nii?: number
  net_cf?: number
  receita_net_cof?: number
  margem_adq?: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function FluxoCaixa({ pnl, pnlStatus, credito, creditoStatus, defaultOpen = false }: Props) {
  const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set([...LINES.map(l => l.key), '_today']))
  const [, forceRender] = useState(0)
  const brushRef = useRef({ start: 0, end: -1 })
  const skipOnChange = useRef(false)

  const isLoading = pnlStatus === 'loading' || creditoStatus === 'loading'
  const hasError = (pnlStatus === 'error' && creditoStatus === 'error')
  const hasData = (pnl && pnl.length > 0) || (credito && credito.length > 0)

  const data = useMemo(() => {
    const pointsMap = new Map<string, ChartPoint>()

    if (credito) {
      credito.forEach(r => {
        pointsMap.set(r.mes, {
          mes: r.mes,
          receita_juros: parseFloat(r.receita_juros),
          nii_credito: parseFloat(r.nii),
          risk_adj_nii: parseFloat(r.risk_adj_nii),
          net_cf: parseFloat(r.net_cf),
        })
      })
    }

    if (pnl) {
      pnl.forEach(r => {
        const existing = pointsMap.get(r.mes) || { mes: r.mes }
        pointsMap.set(r.mes, {
          ...existing,
          receita_net_cof: parseFloat(r.receita_net_cof),
          margem_adq: parseFloat(r.margem),
        })
      })
    }

    const sorted = Array.from(pointsMap.values()).sort((a, b) => a.mes.localeCompare(b.mes))
    // Reset brush when data changes — start at 75% zoom (skip first 25%)
    const offset = Math.round(sorted.length * 0.25)
    brushRef.current = { start: offset, end: sorted.length - 1 }
    return sorted
  }, [pnl, credito])

  const toggleLine = (key: string) => {
    setVisibleLines(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleGroup = (group: string) => {
    const groupKeys = LINES.filter(l => l.group === group).map(l => l.key)
    const allVisible = groupKeys.every(k => visibleLines.has(k))
    setVisibleLines(prev => {
      const next = new Set(prev)
      groupKeys.forEach(k => allVisible ? next.delete(k) : next.add(k))
      return next
    })
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const len = data.length
    if (len < 3) return

    const { start, end } = brushRef.current
    const effectiveEnd = end < 0 ? len - 1 : end
    const range = effectiveEnd - start
    if (range < 2 && e.deltaY > 0) return

    const mid = (start + effectiveEnd) / 2
    const step = Math.max(1, Math.round(range * 0.15))
    const zoomIn = e.deltaY < 0

    let ns: number, ne: number
    if (zoomIn) {
      ns = Math.min(Math.round(mid) - 1, start + step)
      ne = Math.max(Math.round(mid) + 1, effectiveEnd - step)
    } else {
      ns = Math.max(0, start - step)
      ne = Math.min(len - 1, effectiveEnd + step)
    }
    if (ns >= ne) return

    brushRef.current = { start: ns, end: ne }
    skipOnChange.current = true
    forceRender(c => c + 1)
  }, [data.length])

  if (isLoading) return (
    <CollapsibleCard title="Fluxo de Caixa Mensal" defaultOpen={defaultOpen}><CardSkeleton /></CollapsibleCard>
  )

  if (hasError || !hasData) return (
    <CollapsibleCard title="Fluxo de Caixa Mensal" defaultOpen={defaultOpen}><p className="text-gray-400 text-sm">Sem dados</p></CollapsibleCard>
  )

  const hasCredito = credito && credito.length > 0
  const hasAdq = pnl && pnl.length > 0
  const bStart = brushRef.current.start
  const bEnd = brushRef.current.end < 0 ? data.length - 1 : brushRef.current.end

  return (
    <CollapsibleCard
      title="Fluxo de Caixa Mensal"
      defaultOpen={defaultOpen}
      headerRight={
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">Scroll para zoom · Arraste para navegar</span>
          <InfoTooltip lines={[
            'Receita Juros: Receita bruta de juros do empréstimo (financial_income_net)',
            'NII: Receita Juros - Funding Cost - Capital Cost → margem de intermediação',
            'Risk Adj NII: NII - PDD → margem após custo de inadimplência',
            'Net CF: Risk Adj NII - Custo Variável → fluxo de caixa líquido do período',
            'Receita nCOF (Adq): Receita de adquirência líquida de COF',
            'Margem (Adq): Receita nCOF - COGs de adquirência',
          ]} />
        </div>
      }
    >

      {/* Filtros de linhas */}
      <div className="flex flex-wrap gap-3 mb-4">
        {hasCredito && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleGroup('credito')}
              className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full hover:bg-blue-100 transition-colors"
            >
              Credito
            </button>
            {LINES.filter(l => l.group === 'credito').map(line => (
              <button
                key={line.key}
                onClick={() => toggleLine(line.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  visibleLines.has(line.key)
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: line.color }} />
                {line.name.replace(' (Cred)', '')}
              </button>
            ))}
          </div>
        )}
        {hasAdq && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleGroup('adquirencia')}
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors"
            >
              Adquirencia
            </button>
            {LINES.filter(l => l.group === 'adquirencia').map(line => (
              <button
                key={line.key}
                onClick={() => toggleLine(line.key)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  visibleLines.has(line.key)
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: line.color }} />
                {line.name.replace(' (Adq)', '')}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => toggleLine('_today')}
          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
            visibleLines.has('_today')
              ? 'border-orange-200 bg-orange-50'
              : 'border-gray-200 bg-gray-50 opacity-50'
          }`}
        >
          <span className="inline-block w-2 h-2 rounded-full mr-1 bg-orange-400" style={{ borderStyle: 'dashed' }} />
          Hoje
        </button>
      </div>

      <div onWheel={(e) => { e.stopPropagation(); handleWheel(e) }} ref={(el) => {
        if (el) {
          el.onwheel = (e) => e.preventDefault()
        }
      }}>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#999" strokeDasharray="2 2" />
          {visibleLines.has('_today') && (
            <ReferenceLine
              x={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
              stroke="#f97316"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: 'Hoje', position: 'top', fill: '#f97316', fontSize: 10 }}
            />
          )}

          <Brush
            dataKey="mes"
            height={28}
            stroke="#8884d8"
            startIndex={bStart}
            endIndex={bEnd}
            tickFormatter={(v: string) => v}
            onChange={(range: any) => {
              if (skipOnChange.current) {
                skipOnChange.current = false
                return
              }
              brushRef.current = { start: range.startIndex, end: range.endIndex }
            }}
          />

          {LINES.map(line => {
            const withLabel = line.key === 'net_cf' || line.key === 'margem_adq'
            return (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={2}
                strokeDasharray={'dashed' in line && line.dashed ? '5 3' : undefined}
                dot={withLabel ? { r: 2, fill: line.color } : false}
                connectNulls
                hide={!visibleLines.has(line.key)}
                label={withLabel ? { content: (props: any) => {
                  const { x, y, value } = props
                  if (value === undefined || value === null) return null
                  const v = Math.abs(value) >= 1e6 ? `${(value/1e6).toFixed(1)}M`
                    : Math.abs(value) >= 1e3 ? `${(value/1e3).toFixed(0)}K` : value.toFixed(0)
                  return <text x={x} y={y - 6} textAnchor="middle" fontSize={9} fill={line.color} fontWeight={600}>{v}</text>
                }} : undefined}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </CollapsibleCard>
  )
}
