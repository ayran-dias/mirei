import AnimatedHero from '../components/AnimatedHero'
/**
 * Enterprise.tsx — Felícia 360
 * Lazy-loading: queries só disparam na primeira abertura do card.
 * CollapsibleCard monta children apenas ao abrir, mantém mounted após.
 */
import { exportToXlsx } from '../utils/exportXlsx'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, BarChart, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import CollapsibleCard from '../components/CollapsibleCard'
import CardCreditoLifetime from '../components/CardCreditoLifetime'

// ── Tipos ─────────────────────────────────────────────────────
interface BaseGeralRow { mes:string;gmv:string;tpv_cartao:string;tpv_pix:string;tpv_boleto:string;tpv_sub:string;tpv_gtw:string;net_mdr:string;net_mdr_pct:string;floating_conta:string;floating_pct:string;delay_rcta:string;delay_pct:string;aluguel:string;aluguel_pct:string;net_rav:string;rav_pct:string;rcta_ted:string;rcta_pix:string;pctg_pix:string;receita_ncof:string;tkr_ncof:string;cogs:string;margem:string;margem_gmv:string }
interface Visao3MRow { grupo:string;gmv_m3:string;gmv_m2:string;gmv_m1:string;gmv_m0:string;ncof_m3:string;ncof_m2:string;ncof_m1:string;ncof_m0:string }
interface TransRow { mes:string;ctpv:string;mdr:string;ic:string;fee:string;net_mdr:string;impostos:string;mdr_pct:string;ic_pct:string;fee_pct:string;net_mdr_pct:string;impostos_pct:string }
interface TransGRow { grupo:string;ctpv_m1:string;mdr_pct_m1:string;ic_pct_m1:string;fee_pct_m1:string;net_mdr_pct_m1:string;ctpv_m0:string;mdr_pct_m0:string;ic_pct_m0:string;fee_pct_m0:string;net_mdr_pct_m0:string }
interface RAVRow { mes?:string;grupo?:string;tpv_ant:string;gross:string;pct_rav:string;rcta_rav:string;cof:string;mrg_rav:string;mrg_rav_pct:string;tx_simples:string;duration_dc:string }
interface ModalRow { band:string;modal:string;share:string;mdr_pct:string;ic_pct:string;fee_pct:string;net_mdr_pct:string }
interface MetRow { grupo:string;gmv:string;tpv_cartao:string;tpv_pix:string;net_mdr:string;net_mdr_pct:string;gross_rav:string;floating:string;floating_pct:string;rcta_pix:string;pix_pct:string;mrg_rav:string;tx_simples:string;duration_dc:string;rct_netcof:string;tkr_ncof:string;margem:string;margem_gmv:string }
interface LRRow { mes:string;rcta_net_mdr:string;rcta_pix:string;mrg_rav:string;rcta_gateway:string;rcta_aluguel:string;rcta_floating:string;rcta_boleto:string;rcta_antifraude:string;rcta_transf:string;rcta_setup:string;receita_ncof:string;custo_servir:string;margem:string }
interface TPRow { mes:string;gmv:string;tpv_sub:string;tpv_gtw:string;tpv_boleto:string;tpv_pix:string;tpv_cartao:string;net_mdr:string;net_mdr_pct:string;floating:string;floating_pct:string;rcta_pix_pagarme:string;rcta_pix_pos:string;rcta_pix_total:string;pix_pct:string;gross_rav:string;rcta_rav:string;cof:string;mrg_rav:string;mrg_rav_pct:string;tx_simples:string;duration_dc:string;aluguel:string;aluguel_pct:string;rcta_boleto:string;rcta_gateway:string;rcta_antifraude:string;rcta_transf:string;rcta_setup:string;receita_ncof:string;tkr_ncof:string;margem:string;margem_gmv:string }
interface AfilRow { grupo:string;afiliacao:string;documento:string;mcc:string;categoria:string;avg_tpv_3m:string;avg_ncof_3m:string }
interface FiltOpt { tipo:string;valor:string }

// ── Helpers ───────────────────────────────────────────────────
const N = (n: number, d: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const mi = (v: string | number, d = 2) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n) || n === 0) return ''
  const a = Math.abs(n)
  if (a >= 1e9) return N(n / 1e9, d) + 'B'
  if (a >= 1e6) return N(n / 1e6, d) + 'M'
  if (a >= 1e3) return N(n / 1e3, d) + 'K'
  return N(n, d)
}
const pct = (v: string | number, d = 2) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n) || n === 0) return ''
  return N(n * 100, d) + '%'
}
const fmtBps = (v: number | string | null | undefined): string => {
  const n = parseFloat(String(v ?? ''))
  if (isNaN(n)) return '—'
  return (n * 10000).toFixed(1) + ' bps'
}
const neg = (v: string) => { const n = parseFloat(v); return !isNaN(n) && n < 0 }
const tdC = (v: string) => `px-2 py-1.5 text-right font-sans text-xs ${neg(v) ? 'text-[#d70000]' : 'text-[#1e281e]'}`
const TF = { fontFamily: "'Roboto','Manrope',sans-serif" }
const RH = 32, HH = 34, TMAX = RH * 7 + HH, PG = 20

function getML() {
  const now = new Date()
  const f = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  const s = (m: number) => { const d = new Date(now); d.setMonth(d.getMonth() - m); return d }
  return { m3: f(s(3)), m2: f(s(2)), m1: f(s(1)), m0: f(now) + ' MTD' }
}

// ── Export XLSX (SheetJS — arquivo .xlsx real, sem aviso de formato) ─────────
// Colunas de identificação: sempre exportadas como texto (preserva zeros à esquerda)
const TEXT_EXPORT_COLS = new Set(['documento', 'doc', 'cnpj', 'cpf', 'afiliacao', 'afiliação', 'stonecode', 'sc', 'clientcnpjorcpf', 'mcc'])
const isTextCol = (h: string) => TEXT_EXPORT_COLS.has(h.toLowerCase().replace(/[\s_-]/g, ''))

function exportXLS(rows: Record<string, string>[], filename: string) {
  if (!rows.length) return
  const hs = Object.keys(rows[0])
  const headers = hs.map(h => ({ key: h, label: h }))
  // Para colunas de texto (CNPJ, stonecode), forçar string mesmo se parecer número
  const data = rows.map(row => {
    const out: Record<string, any> = {}
    hs.forEach(h => {
      const v = row[h]
      if (isTextCol(h)) {
        out[h] = v || ''
      } else {
        out[h] = v
      }
    })
    return out
  })
  exportToXlsx(data, headers, filename)
}

function ExportBtn({ data, name }: { data: Record<string, string>[] | null; name: string }) {
  if (!data?.length) return null
  return (
    <button onClick={() => exportXLS(data, name)}
      className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-[#00461e] border border-[#c8d2c8] rounded-full hover:bg-[#f5fff5] transition-colors">
      ⬇ Excel
    </button>
  )
}

// ── MultiCombo — seleção múltipla de grupos ───────────────────
function MultiCombo({ opts, vals, onChange }: { opts: string[]; vals: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = opts.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 80)
  const toggle = (o: string) => onChange(vals.includes(o) ? vals.filter(v => v !== o) : [...vals, o])
  const clearAll = () => onChange([])
  const label = vals.length === 0 ? 'Todos os grupos' : vals.length === 1 ? vals[0] : `${vals.length} grupos selecionados`

  return (
    <div ref={ref} className="relative flex-1 max-w-xs">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1 text-xs border border-[#c8d2c8] rounded-lg bg-white focus:outline-none focus:border-[#00461e] text-left">
        <span className={vals.length > 0 ? 'text-[#1e281e] font-semibold' : 'text-[#c8d2c8]'}>{label}</span>
        <span className="text-[#96a096]">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-[#c8d2c8] rounded-xl shadow-xl z-50 min-w-[220px] w-max max-w-xs max-h-56 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-[#f0f4f0] px-3 py-1.5 flex items-center gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..."
              className="flex-1 text-xs outline-none placeholder-[#c8d2c8]" />
            {vals.length > 0 && <button onClick={clearAll} className="text-[10px] text-[#96a096] hover:text-[#505a50] whitespace-nowrap">Limpar ({vals.length})</button>}
          </div>
          {filtered.map(o => (
            <label key={o} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f5fff5] cursor-pointer">
              <input type="checkbox" checked={vals.includes(o)} onChange={() => toggle(o)} className="accent-[#00461e]" />
              <span className="text-xs text-[#1e281e]">{o}</span>
            </label>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-xs text-[#96a096]">Sem resultados</div>}
        </div>
      )}
    </div>
  )
}

// MGS = alias mantido para compatibilidade
const MGS = GS

// ── GAS hooks ─────────────────────────────────────────────────
function useGASLazy<T>(fn: string) {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = useCallback((args?: unknown) => {
    if (typeof google === 'undefined' || !(google as any).script?.run) return
    setLoading(true); setError(null)
    const r = (google as any).script.run
      .withSuccessHandler((d: T[]) => { setData(d); setLoading(false) })
      .withFailureHandler((e: { message: string }) => { setError(e.message); setLoading(false) })
    r[fn](args ?? null)
  }, [fn])
  return { data, loading, error, run }
}
function useGAS<T>(fn: string) {
  const h = useGASLazy<T>(fn)
  useEffect(() => { h.run() }, []) // eslint-disable-line
  return h
}

// ── UI atoms ──────────────────────────────────────────────────
function Sk({ rows = 7, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <tbody>{Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-b border-[#f0f4f0]">
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j} className="px-2 py-2">
                <div className="h-3 bg-[#e8f0e8] rounded animate-pulse" style={{ width: j === 0 ? '80px' : '54px' }} />
              </td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function VB({ cur, prev }: { cur: number; prev: number }) {
  if (!prev || !cur) return <span className="text-[#c8d2c8] text-xs">—</span>
  // Fórmula Looker: (novo - antigo) / |novo| — usa valor corrente como base
  const v = ((cur - prev) / Math.abs(cur)) * 100
  return <span className={`text-xs font-semibold ${v >= 0 ? 'text-[#007d00]' : 'text-[#d70000]'}`}>{v >= 0 ? '+' : ''}{N(v, 0)}%</span>
}

function ST({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-auto rounded-lg border border-[#e8f0e8]" style={{ maxHeight: TMAX, ...TF }}>
      {children}
    </div>
  )
}

function Pg({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PG)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-2 px-1">
      <span className="text-[10px] text-[#96a096]">{total} itens · pág. {page + 1}/{pages}</span>
      <div className="flex gap-1">
        <button disabled={page === 0} onClick={() => onChange(page - 1)} className="px-2 py-0.5 text-xs rounded border border-[#c8d2c8] disabled:opacity-30 hover:bg-[#f5fff5]">‹</button>
        <button disabled={page >= pages - 1} onClick={() => onChange(page + 1)} className="px-2 py-0.5 text-xs rounded border border-[#c8d2c8] disabled:opacity-30 hover:bg-[#f5fff5]">›</button>
      </div>
    </div>
  )
}

// GS agora é multi-select — todos os cards usam o mesmo padrão
function GS({ vals, onChange, opts }: { vals: string[]; onChange: (v: string[]) => void; opts: string[] }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-semibold text-[#505a50] whitespace-nowrap">Grupo Marca:</span>
      <MultiCombo opts={opts} vals={vals} onChange={onChange} />
    </div>
  )
}

function Combo({ label, opts, val, onChange }: { label: string; opts: string[]; val: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = opts.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 60)
  return (
    <div ref={ref} className="relative">
      <input placeholder={label} value={val || q}
        onFocus={() => { setOpen(true); if (val) setQ('') }}
        onChange={e => { setQ(e.target.value); onChange(''); setOpen(true) }}
        className="w-full px-2 py-1 text-xs border border-[#c8d2c8] rounded-lg bg-white focus:outline-none focus:border-[#00461e] placeholder-[#c8d2c8]" />
      {val && <button onClick={() => { onChange(''); setQ('') }} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#96a096] text-xs leading-none">✕</button>}
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-[#c8d2c8] rounded-xl shadow-xl z-50 min-w-[200px] w-max max-w-xs max-h-48 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-3 py-2 text-xs text-[#96a096]">Sem resultados</div>
            : filtered.map(o => (
              <button key={o} onMouseDown={() => { onChange(o); setQ(''); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#f5fff5] ${val === o ? 'bg-[#f5fff5] font-semibold text-[#00461e]' : 'text-[#1e281e]'}`}>{o}</button>
            ))}
        </div>
      )}
    </div>
  )
}

// ── FilterBar — multi-select + cascading ──────────────────────
interface BF {
  grupos: string[]; grupo1s: string[]; grupo2s: string[]
  docs: string[]; scs: string[]; mccs: string[]; mes: string
}
const EF: BF = { grupos:[], grupo1s:[], grupo2s:[], docs:[], scs:[], mccs:[], mes:'' }

function FB({ runOpts, onApply, onFilteredDocs }: {
  runOpts: (f: BF) => void  // re-fetches cascaded options
  onApply: (f: BF) => void
  onFilteredDocs?: (docs: string[]) => void
}) {
  const [f, setF] = useState<BF>(EF)
  const [opts, setOpts] = useState<Record<string, string[]>>({})
  const { data: rawOpts, loading: optsLoading, run: fetchOpts } = useGASLazy<FiltOpt>('getEnterpriseFilterOptions')

  // Carga inicial de opções
  useEffect(() => { fetchOpts() }, []) // eslint-disable-line

  // Quando opções chegam, parsear por tipo
  useEffect(() => {
    if (!rawOpts) return
    const map: Record<string, string[]> = {}
    for (const { tipo, valor } of rawOpts) { if (!map[tipo]) map[tipo] = []; map[tipo].push(valor) }
    setOpts(map)
    // Reportar docs filtrados ao parent (cascaded = já respeitam filtros ativos)
    if (onFilteredDocs) onFilteredDocs(map.doc || [])
  }, [rawOpts])

  // Cascading: quando qualquer filtro muda, re-busca as opções filtradas
  const cascade = (next: BF) => {
    setF(next)
    fetchOpts(next)
  }

  const clear = () => { setF(EF); fetchOpts(); onApply(EF) }

  const field = (label: string, key: keyof BF, optsKey: string) => (
    <div>
      <label className="block text-[10px] font-semibold text-[#505a50] mb-0.5">{label}</label>
      <MultiCombo
        opts={opts[optsKey] || []}
        vals={(f[key] as string[]) || []}
        onChange={v => cascade({ ...f, [key]: v })}
      />
    </div>
  )

  return (
    <div className="mb-4 p-3 bg-[#f5fff5] rounded-xl border border-[#c8d2c8]">
      {optsLoading && <div className="text-[10px] text-[#96a096] mb-2">Carregando opções...</div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-3">
        {field('Grupo', 'grupos',  'grupo')}
        {field('Grupo 1',     'grupo1s', 'grupo1')}
        {field('Grupo 2',     'grupo2s', 'grupo2')}
        {field('Documento',   'docs',    'doc')}
        {field('Afiliação',   'scs',     'sc')}
        {field('MCC',         'mccs',    'mcc')}
        <div>
          <label className="block text-[10px] font-semibold text-[#505a50] mb-0.5">Mês</label>
          <Combo label="Selecionar..." opts={opts.mes || []} val={f.mes}
            onChange={v => cascade({ ...f, mes: v })} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#96a096]">
          {Object.values(f).flat().filter(Boolean).length > 0
            ? `${Object.values(f).flat().filter(Boolean).length} filtro(s) ativos`
            : 'Nenhum filtro aplicado'}
        </span>
        <div className="flex gap-2">
          <button onClick={clear} className="px-3 py-1 text-xs text-[#505a50] border border-[#c8d2c8] rounded-full hover:bg-white">Limpar</button>
          <button onClick={() => onApply(f)} className="px-4 py-1 text-xs font-semibold bg-[#00461e] text-white rounded-full hover:bg-[#003015]">Aplicar</button>
        </div>
      </div>
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────
// Formata valor para exibição no range min/max do header
const fmtK = (v: number): string => {
  const a = Math.abs(v)
  if (a >= 1e9) return N(v / 1e9, 1) + 'B'
  if (a >= 1e6) return N(v / 1e6, 1) + 'M'
  if (a >= 1e3) return N(v / 1e3, 1) + 'K'
  if (a >= 1) return N(v, 1)
  // valores fracionários (percentuais já vêm como 0.01234)
  return N(v * 100, 2) + '%'
}

function useHeatmap(rows: Record<string, any>[], numericCols: string[]) {
  return useMemo(() => {
    const stats: Record<string, { min: number; max: number }> = {}
    numericCols.forEach(col => {
      const vals = rows.map(r => parseFloat(r[col]) || 0).filter(v => !isNaN(v) && isFinite(v))
      if (!vals.length) return
      stats[col] = { min: Math.min(...vals), max: Math.max(...vals) }
    })
    const getCellBg = (col: string, value: number): string => {
      const s = stats[col]
      if (!s || s.max === s.min) return 'transparent'
      const ratio = (value - s.min) / (s.max - s.min)
      // Colunas onde todos os valores são negativos → vermelho (maior magnitude = mais vermelho)
      if (s.max <= 0) {
        const invRatio = 1 - ratio  // ratio=0 é o mais negativo → invRatio=1 → mais vermelho
        return `rgba(220,38,38,${Math.min(invRatio * 0.12, 0.12)})`
      }
      return `rgba(0,70,30,${Math.min(ratio * 0.18, 0.18)})`
    }
    return { getCellBg, stats }
  }, [rows, numericCols])
}

// Hook: retorna apenas colunas com pelo menos 1 valor não-zero e não-nulo nos dados retornados
function useVisibleColumns(data: Record<string, any>[], allCols: string[]) {
  return useMemo(() => {
    if (!data || !data.length) return allCols
    return allCols.filter(col => {
      if (col === 'mes') return true
      return data.some(row => {
        const v = row[col]
        if (v === null || v === undefined || v === '' || v === '—') return false
        const n = parseFloat(String(v))
        return !isNaN(n) && Math.abs(n) > 0
      })
    })
  }, [data, allCols])
}

// ════════════════════════════════════════════════════════════════
// 1 — Base Geral
// ════════════════════════════════════════════════════════════════
const ALL_BG_COLS: [keyof BaseGeralRow, string, boolean?, boolean?][] = [
  ['gmv',          'GMV'],
  ['tpv_cartao',   'TPV Cartão'],
  ['tpv_pix',      'TPV Pix'],
  ['tpv_boleto',   'TPV Boleto'],
  ['tpv_sub',      'TPV Sub'],
  ['tpv_gtw',      'TPV GTW'],
  ['net_mdr',      'NetMDR'],
  ['net_mdr_pct',  'NetMDR%',   true],
  ['floating_conta','Float. Conta'],
  ['floating_pct', 'Float.%',   true],
  ['delay_rcta',   'Delay (rcta)'],
  ['delay_pct',    'Delay%',    true],
  ['aluguel',      'Aluguel'],
  ['aluguel_pct',  '%Aluguel',  true],
  ['net_rav',      'NetRAV'],
  ['rav_pct',      'RAV%',      true],
  ['rcta_ted',     'Rcta. TED'],
  ['rcta_pix',     'Pix (rcta)'],
  ['pctg_pix',     'Pix (bps)',  false, true],
  ['receita_ncof', 'Rcta. nCOF'],
  ['tkr_ncof',     'TkR nCOF',  true],
  ['cogs',         'COGs'],
  ['margem',       'Margem'],
  ['margem_gmv',   'Mrg/GMV',   true],
]

function C1({ onFilteredDocs, onActiveFilters }: { onFilteredDocs?: (docs: string[]) => void; onActiveFilters?: (f: Record<string, string[]>) => void }) {
  const { data, loading, run } = useGASLazy<BaseGeralRow>('getEnterpriseBaseGeral')
  useEffect(() => { run(); if (onActiveFilters) onActiveFilters({}) }, []) // eslint-disable-line — trigger initial summary with empty filters
  const [sel, setSel] = useState<Set<string>>(new Set(ALL_BG_COLS.map(([k]) => k as string)))
  const [showPicker, setShowPicker] = useState(false)
  const toggle = (k: string) => setSel(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  // Sort state
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  function handleSort(col: string) {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortCol(null); setSortDir('asc') }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // Auto-ocultar colunas onde todos os valores são zero/null nos dados retornados
  const allColKeys = ALL_BG_COLS.map(([k]) => k as string)
  const nonEmptyCols = useVisibleColumns((data || []) as Record<string, any>[], allColKeys)
  const autoHiddenCount = allColKeys.length - nonEmptyCols.length

  // visCols: colunas ativas no picker E com dados (não todas-zero)
  const visCols = ALL_BG_COLS.filter(([k]) => sel.has(k as string) && nonEmptyCols.includes(k as string))

  // Heatmap: calcular stats para todas as colunas numéricas visíveis
  const numericCols = visCols.map(([k]) => k as string)
  const { getCellBg, stats } = useHeatmap((data || []) as Record<string, any>[], numericCols)

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortCol || !data) return data
    return [...data].sort((a, b) => {
      if (sortCol === 'mes') {
        const sa = String(a.mes ?? '').toLowerCase()
        const sb = String(b.mes ?? '').toLowerCase()
        return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
      }
      const va = parseFloat(String(a[sortCol as keyof BaseGeralRow] ?? ''))
      const vb = parseFloat(String(b[sortCol as keyof BaseGeralRow] ?? ''))
      const isNum = !isNaN(va) && !isNaN(vb)
      if (isNum) return sortDir === 'asc' ? va - vb : vb - va
      const sa = String(a[sortCol as keyof BaseGeralRow] ?? '').toLowerCase()
      const sb = String(b[sortCol as keyof BaseGeralRow] ?? '').toLowerCase()
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
    })
  }, [data, sortCol, sortDir])

  return (
    <>
      <FB runOpts={() => {}} onApply={f => { run(f); if (onActiveFilters) onActiveFilters({ grupos: f.grupos, grupo1s: f.grupo1s, grupo2s: f.grupo2s, docs: f.docs, scs: f.scs, mccs: f.mccs }) }} onFilteredDocs={onFilteredDocs} />
      {loading && <Sk rows={7} cols={9} />}
      {!loading && data && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] text-[#505a50]">
              {visCols.length}/{ALL_BG_COLS.length} métricas
              {autoHiddenCount > 0 && <span className="text-[#96a096] ml-1">({autoHiddenCount} sem dados ocultas)</span>}
            </span>
            <div className="flex gap-2">
              <ExportBtn data={data as any} name="enterprise_base_geral" />
              <button onClick={() => setShowPicker(!showPicker)}
                className="px-3 py-1 text-xs font-semibold bg-[#f5fff5] border border-[#c8d2c8] rounded-full text-[#00461e] hover:bg-[#e8f0e8]">
                ⚙ Métricas
              </button>
            </div>
          </div>
          {showPicker && (
            <div className="mb-3 p-3 bg-[#f5fff5] rounded-xl border border-[#c8d2c8] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
              {ALL_BG_COLS.map(([k, l]) => {
                const isEmpty = !nonEmptyCols.includes(k as string)
                return (
                  <label key={k as string} className={`flex items-center gap-1.5 cursor-pointer ${isEmpty ? 'opacity-40' : ''}`} title={isEmpty ? 'Sem dados nesta carteira' : undefined}>
                    <input type="checkbox" checked={sel.has(k as string)} onChange={() => toggle(k as string)} className="accent-[#00461e]" disabled={isEmpty} />
                    <span className="text-xs text-[#1e281e]">{l}{isEmpty && <span className="text-[9px] ml-0.5 text-[#96a096]">∅</span>}</span>
                  </label>
                )
              })}
            </div>
          )}
          <ST>
            <table className="w-full text-xs">
              <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
                <th
                  onClick={() => handleSort('mes')}
                  className="px-3 py-2 text-left font-semibold text-[#00461e] sticky left-0 bg-[#f5fff5] text-[11px] cursor-pointer select-none hover:bg-[#003d17] transition-colors"
                  title="Clique para ordenar"
                >
                  <div className="flex items-center gap-1">
                    Mês
                    {sortCol === 'mes' ? (sortDir === 'asc' ? ' ▴' : ' ▾') : ' ⇅'}
                  </div>
                  <div className="text-[9px] text-gray-400 font-normal mt-0.5">(Min-Max)</div>
                </th>
                {visCols.map(([k, l]) => {
                  const s = stats[k as string]
                  const isNeg = s && s.max <= 0
                  const gradColor = isNeg ? 'rgba(220,38,38,0.25)' : 'rgba(0,70,30,0.25)'
                  const colKey = k as string
                  return (
                    <th
                      key={k}
                      onClick={() => handleSort(colKey)}
                      className="px-2 py-2 text-right font-semibold text-[#505a50] whitespace-nowrap text-[11px] cursor-pointer select-none hover:bg-[#003d17] transition-colors"
                      title="Clique para ordenar"
                    >
                      <div className="flex items-center justify-end gap-1">
                        {l}
                        {sortCol === colKey ? (sortDir === 'asc' ? ' ▴' : ' ▾') : ' ⇅'}
                      </div>
                      {s && s.min !== s.max && (
                        <>
                          <div className="w-full h-1 rounded-full mt-0.5" style={{
                            background: `linear-gradient(to right, rgba(0,70,30,0.02), ${gradColor})`
                          }} />
                          <div className="text-[9px] text-gray-400 font-normal mt-0.5 leading-tight">
                            {fmtK(s.min)} → {fmtK(s.max)}
                          </div>
                        </>
                      )}
                    </th>
                  )
                })}
              </tr></thead>
              <tbody>{(sortedData || data).map((row, i) => (
                <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                  <td className="px-3 py-1.5 font-semibold text-[#00461e] sticky left-0 bg-white text-xs">{row.mes}</td>
                  {visCols.map(([k, , p, b]) => {
                    const colKey = k as string
                    const numVal = parseFloat(row[k])
                    const bg = getCellBg(colKey, isNaN(numVal) ? 0 : numVal)
                    return (
                      <td key={k} className={tdC(row[k])} style={{ backgroundColor: bg }}>
                        {b ? fmtBps(row[k]) : p ? pct(row[k]) : mi(row[k])}
                      </td>
                    )
                  })}
                </tr>
              ))}</tbody>
            </table>
          </ST>
        </>
      )}
    </>
  )
}
function BaseGeral({ onFilteredDocs, onActiveFilters }: { onFilteredDocs?: (docs: string[]) => void; onActiveFilters?: (f: Record<string, string[]>) => void }) {
  return <CollapsibleCard title="Base Geral" color="green"><C1 onFilteredDocs={onFilteredDocs} onActiveFilters={onActiveFilters} /></CollapsibleCard>
}

// ════════════════════════════════════════════════════════════════
// 2 — Visão 3M
// ════════════════════════════════════════════════════════════════
function C2({ opts }: { opts: string[] }) {
  const { data, loading } = useGAS<Visao3MRow>('getEnterpriseVisao3M')
  const ml = getML()
  const [tab, setTab] = useState<'gmv' | 'ncof' | 'tkr'>('gmv')
  const [gqs, setGqs] = useState<string[]>([])
  const [page, setPage] = useState(0)

  const gv = (row: Visao3MRow, mk: string) => {
    if (tab === 'tkr') {
      const nc = parseFloat((row as any)[`ncof_${mk}`])
      const gm = parseFloat((row as any)[`gmv_${mk}`])
      return gm ? nc / gm : 0
    }
    return parseFloat((row as any)[`${tab === 'gmv' ? 'gmv' : 'ncof'}_${mk}`])
  }
  const fv = (row: Visao3MRow, mk: string) => { const v = gv(row, mk); return tab === 'tkr' ? pct(v) : mi(v) }
  const filtered = (data || []).filter(r => gqs.length === 0 || gqs.includes(r.grupo))
  const paginated = filtered.slice(page * PG, (page + 1) * PG)
  useEffect(() => setPage(0), [gqs, tab])

  return (
    <>
      <div className="flex gap-2 mb-3">
        {(['gmv', 'ncof', 'tkr'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${tab === t ? 'bg-[#00461e] text-white' : 'bg-[#f5fff5] text-[#505a50] hover:bg-[#e8f0e8]'}`}>
            {t === 'gmv' ? 'TPV' : t === 'ncof' ? 'Rcta. nCOF' : 'TakeRate nCOF'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1"><GS vals={gqs} onChange={setGqs} opts={opts} /></div>
        <ExportBtn data={filtered as any} name="enterprise_visao3m" />
      </div>
      {loading && <Sk rows={7} cols={8} />}
      {!loading && filtered.length > 0 && (
        <>
          <ST>
            <table className="w-full text-xs">
              <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
                <th className="px-3 py-2 text-left font-semibold text-[#00461e] sticky left-0 bg-[#f5fff5] min-w-[130px] text-[11px]">Grupo</th>
                <th className="px-2 py-2 text-center font-semibold text-[#505a50] text-[11px] w-24 whitespace-nowrap">{ml.m3}</th>
                <th className="px-2 py-2 text-center font-semibold text-[#505a50] text-[11px] w-24 whitespace-nowrap">{ml.m2}</th>
                <th className="px-2 py-2 text-center font-semibold text-[#00461e] text-[11px] w-14">Var.</th>
                <th className="px-2 py-2 text-center font-semibold text-[#505a50] text-[11px] w-24 whitespace-nowrap">{ml.m1}</th>
                <th className="px-2 py-2 text-center font-semibold text-[#00461e] text-[11px] w-14">Var.</th>
                <th className="px-2 py-2 text-center font-semibold text-[#505a50] text-[11px] w-24 whitespace-nowrap">{ml.m0}</th>
                <th className="px-2 py-2 text-center font-semibold text-[#00461e] text-[11px] w-14">Var.</th>
              </tr></thead>
              <tbody>{paginated.map((row, i) => {
                const v3 = gv(row, 'm3'), v2 = gv(row, 'm2'), v1 = gv(row, 'm1'), v0 = gv(row, 'm0')
                return (
                  <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                    <td className="px-3 py-1.5 font-medium text-[#1e281e] sticky left-0 bg-white max-w-[130px] truncate text-xs" title={row.grupo}>{row.grupo}</td>
                    <td className="px-2 py-1.5 text-center font-sans text-xs text-[#505a50] w-24">{fv(row, 'm3')}</td>
                    <td className="px-2 py-1.5 text-center font-sans text-xs text-[#505a50] w-24">{fv(row, 'm2')}</td>
                    <td className="px-2 py-1.5 text-center w-14"><VB cur={v2} prev={v3} /></td>
                    <td className="px-2 py-1.5 text-center font-sans text-xs text-[#1e281e] w-24">{fv(row, 'm1')}</td>
                    <td className="px-2 py-1.5 text-center w-14"><VB cur={v1} prev={v2} /></td>
                    <td className="px-2 py-1.5 text-center font-sans text-xs text-[#505a50] w-24">{fv(row, 'm0')}</td>
                    <td className="px-2 py-1.5 text-center w-14"><VB cur={v0} prev={v1} /></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </ST>
          <Pg page={page} total={filtered.length} onChange={setPage} />
        </>
      )}
    </>
  )
}
function Visao3M({ opts }: { opts: string[] }) { return <CollapsibleCard title="Visão 3 Meses — Grupos" color="green"><C2 opts={opts} /></CollapsibleCard> }

// ════════════════════════════════════════════════════════════════
// 3 — Transacional Cartão
// ════════════════════════════════════════════════════════════════
function C3({ opts }: { opts: string[] }) {
  const { data, loading, run } = useGASLazy<TransRow>('getEnterpriseTransacional')
  const [gqs, setGqs] = useState<string[]>([])
  useEffect(() => { run() }, []) // eslint-disable-line
  // MDR linha preta, NetMDR linha verde, IC/Fee/Impostos barras empilhadas verdes
  const cd = data ? [...data].reverse().map(r => ({
    mes: r.mes,
    'IC%': parseFloat(r.ic_pct) * 100,
    'Fee%': parseFloat(r.fee_pct) * 100,
    'Impostos%': parseFloat(r.impostos_pct) * 100,
    'MDR%': parseFloat(r.mdr_pct) * 100,
    'NetMDR%': parseFloat(r.net_mdr_pct) * 100,
  })) : []
  const thC = "px-2 py-2 text-right font-semibold text-[#505a50] text-[11px] whitespace-nowrap"
  return (
    <>
      <GS vals={gqs} onChange={v => { setGqs(v); run({ grupos: v.length ? v : undefined }) }} opts={opts} />
      {loading && <Sk rows={7} cols={7} />}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-[#505a50]">Carteira ao longo dos meses</p>
              <ExportBtn data={data as any} name="enterprise_transacional" />
            </div>
            <ST>
              <table className="w-full" style={TF}>
                <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
                  <th className="px-2 py-2 text-left font-semibold text-[#00461e] text-[11px]">Mês</th>
                  <th className={thC}>CTPV</th><th className={thC}>MDR</th><th className={thC}>IC</th>
                  <th className={thC}>Fee</th><th className={thC}>NetMDR</th><th className={thC}>Impostos</th>
                </tr></thead>
                <tbody>{data.map((row, i) => (
                  <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                    <td className="px-2 py-1.5 font-semibold text-[#00461e] text-xs">{row.mes}</td>
                    <td className={tdC(row.ctpv)}>{mi(row.ctpv)}</td>
                    <td className={tdC(row.mdr)}>{mi(row.mdr)}</td>
                    <td className={tdC(row.ic)}>{mi(row.ic)}</td>
                    <td className={tdC(row.fee)}>{mi(row.fee)}</td>
                    <td className={tdC(row.net_mdr)}>{mi(row.net_mdr)}</td>
                    <td className={tdC(row.impostos)}>{mi(row.impostos)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </ST>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#505a50] mb-2">MDR, NetMDR, IC, Fee, Impostos (% TPV Cartão)</p>
            <ResponsiveContainer width="100%" height={TMAX}>
              <ComposedChart data={cd} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                <YAxis tickFormatter={v => v.toFixed(2) + '%'} tick={{ fontSize: 9 }} width={48} />
                <Tooltip formatter={(v: number, name: string) => {
                  // Formatar como pt-BR com 2 casas: 1,47%
                  const f = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
                  return [f, name]
                }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {/* IC, Fee, Impostos: barras empilhadas — paleta stone */}
                <Bar dataKey="IC%" stackId="a" fill="#007d00" opacity={0.85} />
                <Bar dataKey="Fee%" stackId="a" fill="#00d700" opacity={0.85} />
                <Bar dataKey="Impostos%" stackId="a" fill="#a5fa00" opacity={0.85} />
                {/* MDR linha preta — mais grossa, com pontos e rótulos */}
                <Line type="monotone" dataKey="MDR%" stroke="#1e281e" strokeWidth={3}
                  dot={{ r: 3, fill: '#1e281e' }}
                  label={{ position: 'top', fontSize: 8, fill: '#1e281e',
                    formatter: (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' }} />
                {/* NetMDR linha verde — com pontos e rótulos */}
                <Line type="monotone" dataKey="NetMDR%" stroke="#00461e" strokeWidth={2}
                  dot={{ r: 3, fill: '#00461e' }}
                  label={{ position: 'bottom', fontSize: 8, fill: '#00461e',
                    formatter: (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  )
}
function TransacionalCartao({ opts }: { opts: string[] }) {
  return (
    <CollapsibleCard title="Transacional Cartão" color="green">
      <C3 opts={opts} />
      <div className="mt-6 pt-6 border-t border-[#e8f0e8]">
        <p className="text-[11px] font-bold text-[#00461e] uppercase tracking-wide mb-4">Por Grupo</p>
        <C4 opts={opts} />
      </div>
    </CollapsibleCard>
  )
}

// ════════════════════════════════════════════════════════════════
// 4 — Transacional por Grupo
// ════════════════════════════════════════════════════════════════
function C4({ opts }: { opts: string[] }) {
  const { data, loading, error } = useGAS<TransGRow>('getEnterpriseTransacionalGrupos')
  const [gqs, setGqs] = useState<string[]>([])
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [gqs])
  const thC = "px-2 py-2 text-right font-semibold text-[#505a50] text-[11px] whitespace-nowrap"
  const filtered = (data || []).filter(r => gqs.length === 0 || gqs.includes(r.grupo))
  const paginated = filtered.slice(page * PG, (page + 1) * PG)

  const half = (sfx: 'm1' | 'm0', label: string) => (
    <div>
      <p className="text-[11px] font-semibold text-[#505a50] mb-2">{label}</p>
      <ST>
        <table className="w-full" style={TF}>
          <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
            <th className="px-2 py-2 text-left font-semibold text-[#00461e] text-[11px] min-w-[110px]">Grupo</th>
            <th className={thC}>CTPV</th><th className={thC}>MDR%</th>
            <th className={thC}>IC%</th><th className={thC}>Fee%</th><th className={thC}>NetMDR%</th>
          </tr></thead>
          <tbody>{paginated.map((row, i) => (
            <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
              <td className="px-2 py-1.5 font-medium text-[#1e281e] max-w-[110px] truncate text-xs" title={row.grupo}>{row.grupo}</td>
              <td className={tdC(row[`ctpv_${sfx}` as keyof TransGRow])}>{mi(row[`ctpv_${sfx}` as keyof TransGRow])}</td>
              <td className={tdC(row[`mdr_pct_${sfx}` as keyof TransGRow])}>{pct(row[`mdr_pct_${sfx}` as keyof TransGRow])}</td>
              <td className={tdC(row[`ic_pct_${sfx}` as keyof TransGRow])}>{pct(row[`ic_pct_${sfx}` as keyof TransGRow])}</td>
              <td className={tdC(row[`fee_pct_${sfx}` as keyof TransGRow])}>{pct(row[`fee_pct_${sfx}` as keyof TransGRow])}</td>
              <td className={tdC(row[`net_mdr_pct_${sfx}` as keyof TransGRow])}>{pct(row[`net_mdr_pct_${sfx}` as keyof TransGRow])}</td>
            </tr>
          ))}</tbody>
        </table>
      </ST>
    </div>
  )

  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1"><GS vals={gqs} onChange={setGqs} opts={opts} /></div>
        <ExportBtn data={filtered as any} name="enterprise_trans_grupos" />
      </div>
      {loading && <Sk rows={7} cols={6} />}
      {error && <p className="text-xs text-[#d70000] py-3">Erro: {error}</p>}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {half('m1', 'M-1 (% do TPV)')}{half('m0', 'Mês atual (% do TPV)')}
          </div>
          <Pg page={page} total={filtered.length} onChange={setPage} />
        </>
      )}
    </>
  )
}
// TransacionalGrupos agora está embutido dentro de TransacionalCartao

// ════════════════════════════════════════════════════════════════
// 5 — RAV
// ════════════════════════════════════════════════════════════════
function C5({ opts, mesOpts }: { opts: string[]; mesOpts: string[] }) {
  const { data: canalData, loading: canalLoading, run: runCanal } = useGASLazy<RAVRow>('getEnterpriseRAV')
  const { data: clienteData, loading: clienteLoading, run: runCliente } = useGASLazy<RAVRow>('getEnterpriseRAVCliente')
  const [gqs, setGqs] = useState<string[]>([])
  const [mesCliente, setMesCliente] = useState('')
  const [page, setPage] = useState(0)
  useEffect(() => { runCanal() }, []) // eslint-disable-line
  useEffect(() => { runCliente() }, []) // eslint-disable-line — default = último mês completo (Code.gs)
  useEffect(() => setPage(0), [gqs, mesCliente])

  const cols: [keyof RAVRow, string, boolean?, boolean?][] = [
    ['tpv_ant','TPV Ant.'], ['gross','Gross'], ['pct_rav','%RAV',true],
    ['rcta_rav','Rcta. RAV'], ['cof','COF'], ['mrg_rav','Mrg RAV'],
    ['mrg_rav_pct','Mrg RAV%',true], ['tx_simples','Tx Spls',true],
    ['duration_dc','Duration',false,true],
  ]
  const fmt = (k: keyof RAVRow, v: string, ip?: boolean, ir?: boolean) => {
    if (!v || v === 'null') return ''
    if (ir) return N(parseFloat(v), 0) + 'd'
    if (ip) return pct(v)
    return mi(v)
  }
  const thC = "px-2 py-2 text-right font-semibold text-[#505a50] text-[11px] whitespace-nowrap"
  const filteredC = (clienteData || []).filter(r => gqs.length === 0 || gqs.includes(r.grupo || ""))
  const paginatedC = filteredC.slice(page * PG, (page + 1) * PG)

  // Filtro compartilhado: canal (server-side re-fetch) + cliente (client-side filter)
  const handleGrupoChange = (v: string[]) => { setGqs(v); runCanal({ grupos: v }) }

  return (
    <div className="space-y-5">
      {/* Filtro único no topo — aplica em canal E cliente */}
      <GS vals={gqs} onChange={handleGrupoChange} opts={opts} />

      {/* RAV Canal */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-[#505a50]">RAV (canal)</p>
          <ExportBtn data={canalData as any} name="enterprise_rav_canal" />
        </div>
        {(canalLoading || !canalData) && <Sk rows={7} cols={10} />}
        {!canalLoading && canalData && (
          <ST>
            <table className="w-full text-xs" style={TF}>
              <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
                <th className="px-3 py-2 text-left font-semibold text-[#00461e] sticky left-0 bg-[#f5fff5] text-[11px] min-w-[90px]">Mês</th>
                {cols.map(([k, l]) => <th key={k} className={thC}>{l}</th>)}
              </tr></thead>
              <tbody>{canalData.map((row, i) => (
                <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                  <td className="px-3 py-1.5 font-semibold text-[#00461e] sticky left-0 bg-white text-xs">{row.mes}</td>
                  {cols.map(([k, , ip, ir]) => <td key={k} className={tdC(row[k] || '0')}>{fmt(k, row[k] || '', ip, ir)}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </ST>
        )}
      </div>

      {/* RAV por Cliente */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-[#505a50]">RAV por cliente</p>
          <ExportBtn data={filteredC as any} name="enterprise_rav_cliente" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold text-[#505a50] whitespace-nowrap">Mês:</span>
          <div className="max-w-[140px]">
            <Combo label="Último mês completo" opts={mesOpts} val={mesCliente}
              onChange={v => { setMesCliente(v); runCliente({ grupos: gqs.length ? gqs : undefined, mes: v || undefined }) }} />
          </div>
        </div>
        {(clienteLoading || !clienteData) && <Sk rows={7} cols={10} />}
        {!clienteLoading && clienteData && (
          <>
            <ST>
              <table className="w-full text-xs" style={TF}>
                <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
                  <th className="px-3 py-2 text-left font-semibold text-[#00461e] sticky left-0 bg-[#f5fff5] text-[11px] min-w-[130px]">Grupo</th>
                  {cols.map(([k, l]) => <th key={k} className={thC}>{l}</th>)}
                </tr></thead>
                <tbody>{paginatedC.map((row, i) => (
                  <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                    <td className="px-3 py-1.5 font-medium text-[#1e281e] sticky left-0 bg-white max-w-[130px] truncate text-xs" title={row.grupo}>{row.grupo}</td>
                    {cols.map(([k, , ip, ir]) => <td key={k} className={tdC(row[k] || '0')}>{fmt(k, row[k] || '', ip, ir)}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </ST>
            <Pg page={page} total={filteredC.length} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
function RAVCard({ opts, mesOpts }: { opts: string[]; mesOpts: string[] }) { return <CollapsibleCard title="RAV" color="green"><C5 opts={opts} mesOpts={mesOpts} /></CollapsibleCard> }

// ════════════════════════════════════════════════════════════════
// 6 — Aberturas Modalidade
// ════════════════════════════════════════════════════════════════
const BANDS = ['VISA', 'MASTER', 'ELO', 'HIPER', 'AMEX']
const MODS = ['DEB', 'CRED', 'PSJ1', 'PSJ2']
const ML2: Record<string, string> = { DEB: 'Débito', CRED: 'Crédito', PSJ1: 'PSJ1 (2-6x)', PSJ2: 'PSJ2 (7-12x)' }

function C6({ opts }: { opts: Record<string, string[]> }) {
  const { data, loading, run } = useGASLazy<ModalRow>('getEnterpriseModalidade')
  const [gqs, setGqs] = useState<string[]>([])
  const [mes, setMes] = useState('')
  // Carrega com M-1 por default
  useEffect(() => { run() }, []) // eslint-disable-line

  const reRun = (grupo?: string, mesVal?: string) =>
    run({ grupos: grupo ? [grupo] : undefined, mes: mesVal || undefined })

  const cell = (band: string, modal: string, metric: keyof ModalRow) => {
    const r = data?.find(r => r.band === band && r.modal === modal)
    return r ? pct(r[metric]) : ''
  }
  const thC = "px-3 py-1.5 text-center text-[11px] font-semibold text-white bg-[#00461e]"
  const thShare = "px-3 py-1.5 text-center text-[11px] font-bold text-white bg-[#003015]"

  const Matrix = ({ metric, label }: { metric: keyof ModalRow; label: string }) => (
    <div>
      <p className="text-[11px] font-semibold text-[#505a50] mb-1">{label}</p>
      <table className="w-full text-xs" style={TF}>
        <thead><tr>
          <th className={thC}></th>
          {MODS.map(m => <th key={m} className={thC}>{ML2[m]}</th>)}
        </tr></thead>
        <tbody>
          {/* Linha SHARE — totais por modalidade sem quebra por bandeira */}
          <tr className="border-b-2 border-[#00461e]">
            <td className="px-3 py-1.5 font-bold text-white bg-[#003015] text-xs text-center tracking-wide">SHARE</td>
            {MODS.map(modal => {
              const v = cell('SHARE', modal, metric)
              return <td key={modal} className={`px-3 py-1.5 text-center font-sans text-xs font-bold ${neg(v || '0') ? 'text-[#d70000]' : v ? 'text-[#00461e]' : 'text-[#c8d2c8]'} bg-[#f5fff5]`}>{v || '—'}</td>
            })}
          </tr>
          {/* Linhas por bandeira */}
          {BANDS.map(band => (
            <tr key={band} className="border-b border-[#f0f4f0]">
              <td className="px-3 py-1.5 font-bold text-[#00461e] bg-[#f5fff5] text-xs text-center">{band}</td>
              {MODS.map(modal => {
                const v = cell(band, modal, metric)
                return <td key={modal} className={`px-3 py-1.5 text-center font-sans text-xs ${neg(v || '0') ? 'text-[#d70000]' : v ? 'text-[#1e281e]' : 'text-[#c8d2c8]'}`}>{v || '—'}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#505a50] whitespace-nowrap">Grupo:</span>
          <div className="flex-1">
            <Combo label="Grupo..." opts={opts.grupo || []} val={gqs[0] || ''}
              onChange={v => { const a = v ? [v] : []; setGqs(a); reRun(v, mes) }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#505a50] whitespace-nowrap">Mês:</span>
          <div className="flex-1">
            <Combo label="M-1 (padrão)" opts={opts.mes || []} val={mes}
              onChange={v => { setMes(v); reRun(gqs[0], v) }} />
          </div>
        </div>
      </div>
      {loading && <Sk rows={5} cols={5} />}
      {!loading && data && (
        <div className="space-y-5">
          <Matrix metric="share" label="Share Cartão (%)" />
          <Matrix metric="mdr_pct" label="MDR (%)" />
          <Matrix metric="net_mdr_pct" label="NetMDR (%)" />
          <Matrix metric="ic_pct" label="IC (%)" />
          <Matrix metric="fee_pct" label="Fee (%)" />
        </div>
      )}
    </>
  )
}
function ModalidadeCard({ opts }: { opts: Record<string, string[]> }) {
  return <CollapsibleCard title="Aberturas por Modalidade e Bandeira" color="green"><C6 opts={opts} /></CollapsibleCard>
}

// ════════════════════════════════════════════════════════════════
// 7 — Métricas por Cliente
// ════════════════════════════════════════════════════════════════
function C7({ opts, mesOpts }: { opts: string[]; mesOpts: string[] }) {
  const { data, loading, error, run } = useGASLazy<MetRow>('getEnterpriseMetricasCliente')
  const [mes, setMes] = useState('')
  useEffect(() => { run() }, []) // eslint-disable-line — sem mes = cumulativo (padrão Looker)
  const [gqs, setGqs] = useState<string[]>([])
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [gqs])

  const filtered = (data || []).filter(r => gqs.length === 0 || gqs.includes(r.grupo))
  const paginated = filtered.slice(page * PG, (page + 1) * PG)

  const cols: [keyof MetRow, string, boolean?, boolean?][] = [
    ['gmv','GMV'], ['tpv_cartao','TPV Cart.'], ['tpv_pix','TPV Pix'],
    ['net_mdr','NetMDR'], ['net_mdr_pct','NetMDR%',true],
    ['gross_rav','Gross V.'], ['floating','Floating'], ['floating_pct','Float%',true],
    ['rcta_pix','Rcta. Pix'], ['pix_pct','Pix%',true],
    ['mrg_rav','Mrg. RAV'], ['tx_simples','Tx Spls',true],
    ['duration_dc','Duration',false,true], ['rct_netcof','Rcta. nCOF'],
    ['tkr_ncof','TKR nCOF',true], ['margem','Margem'], ['margem_gmv','Mrg/GMV',true],
  ]
  const fmt = (ip?: boolean, ir?: boolean, v?: string) => {
    if (!v) return ''
    if (ir) return N(parseFloat(v), 0) + 'd'
    if (ip) return pct(v)
    return mi(v)
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <GS vals={gqs} onChange={setGqs} opts={opts} />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#505a50] whitespace-nowrap">Mês:</span>
          <div className="flex-1">
            <Combo label="Sem filtro (cumulativo)" opts={mesOpts} val={mes}
              onChange={v => { setMes(v); run({ mes: v || undefined }) }} />
          </div>
        </div>
      </div>
      <div className="flex justify-end mb-1">
        <ExportBtn data={filtered as any} name="enterprise_metricas_cliente" />
      </div>
      {loading && <Sk rows={7} cols={10} />}
      {error && <p className="text-xs text-[#d70000] py-3">Erro: {error}</p>}
      {!loading && !error && data && (
        <>
          <ST>
            <table className="w-full text-xs" style={TF}>
              <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
                <th className="px-3 py-2 text-left font-semibold text-[#00461e] sticky left-0 bg-[#f5fff5] min-w-[130px] text-[11px]">Grupo</th>
                {cols.map(([k, l]) => <th key={k} className="px-2 py-2 text-right font-semibold text-[#505a50] whitespace-nowrap text-[11px]">{l}</th>)}
              </tr></thead>
              <tbody>{paginated.map((row, i) => (
                <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                  <td className="px-3 py-1.5 font-medium text-[#1e281e] sticky left-0 bg-white max-w-[130px] truncate text-xs" title={row.grupo}>{row.grupo}</td>
                  {cols.map(([k, , ip, ir]) => <td key={k} className={tdC(row[k])}>{fmt(ip, ir, row[k])}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </ST>
          <Pg page={page} total={filtered.length} onChange={setPage} />
        </>
      )}
    </>
  )
}
function MetricasCliente({ opts, mesOpts }: { opts: string[]; mesOpts: string[] }) { return <CollapsibleCard title="Métricas por Cliente" color="green"><C7 opts={opts} mesOpts={mesOpts} /></CollapsibleCard> }

// ════════════════════════════════════════════════════════════════
// 8 — Linhas de Receita
// ════════════════════════════════════════════════════════════════
function C8({ opts }: { opts: string[] }) {
  const { data, loading, run } = useGASLazy<LRRow>('getEnterpriseLinhasReceita')
  const [gqs, setGqs] = useState<string[]>([])
  useEffect(() => { run() }, []) // eslint-disable-line

  // Mapeamento de todas as métricas de receita — só renderizar no gráfico as que tiverem valor
  const METRICS: [keyof LRRow, string, string][] = [
    ['rcta_net_mdr','Rcta. NetMDR','#00461e'],
    ['rcta_pix','Rcta. Pix','#007d00'],
    ['mrg_rav','Margem RAV','#00d700'],
    ['rcta_gateway','Rcta. Gateway','#a5fa00'],
    ['rcta_aluguel','Rcta. Aluguel','#d2f57d'],
    ['rcta_floating','Rcta. Floating','#c8d2c8'],
    ['rcta_boleto','Rcta. Boleto','#b8d2b8'],
    ['rcta_antifraude','Rcta. Antifraude','#96c896'],
    ['rcta_transf','Rcta. Transferência','#78b878'],
    ['rcta_setup','Rcta. Setup','#5aa85a'],
  ]
  const activeMetrics = data ? METRICS.filter(([k]) => data.some(r => parseFloat(r[k] || '0') !== 0)) : []
  const bd = data?.map(r => {
    const obj: Record<string,number|string> = { mes: r.mes }
    METRICS.forEach(([k, label]) => { obj[label] = parseFloat(r[k] || '0') / 1e6 })
    return obj
  }) ?? []
  // COGs = custo de servir; nCOF tracejado preto; Margem verde
  const ld = data?.map(r => ({
    mes: r.mes,
    'Receita nCOF': parseFloat(r.receita_ncof) / 1e6,
    COGs: parseFloat(r.custo_servir) / 1e6,
    Margem: parseFloat(r.margem) / 1e6,
  })) ?? []

  return (
    <>
      <div className="mb-3">
        <GS vals={gqs} onChange={v => { setGqs(v); run({ grupos: v.length ? v : undefined }) }} opts={opts} />
      </div>
      {loading && <div className="h-56 bg-[#f5fff5] rounded animate-pulse" />}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-[#505a50] mb-2">Composição (R$ mi)</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bd} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                <YAxis tickFormatter={v => v.toFixed(0) + 'M'} tick={{ fontSize: 9 }} width={38} />
                <Tooltip formatter={(v: number) => 'R$ ' + v.toFixed(2) + 'M'} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {activeMetrics.map(([, label, color]) => (
                  <Bar key={label} dataKey={label} stackId="a" fill={color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#505a50] mb-2">Receita nCOF vs COGs (R$ mi)</p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={ld} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8f0e8" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                <YAxis tickFormatter={v => v.toFixed(0) + 'M'} tick={{ fontSize: 9 }} width={40} />
                <Tooltip formatter={(v: number) => 'R$ ' + v.toFixed(2) + 'M'} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {/* COGs: barra vermelha */}
                <Bar dataKey="COGs" fill="#d70000" opacity={0.7}
                  label={{ position: 'top', fontSize: 8, fill: '#d70000',
                    formatter: (v: number) => v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M' : '' }} />
                {/* Receita nCOF: linha preta tracejada */}
                <Line type="monotone" dataKey="Receita nCOF" stroke="#1e281e" strokeWidth={2} dot={{ r: 2, fill: '#1e281e' }} strokeDasharray="5 3" />
                {/* Margem: linha verde contínua com rótulos */}
                <Line type="monotone" dataKey="Margem" stroke="#00d700" strokeWidth={2} dot={{ r: 2, fill: '#00d700' }}
                  label={{ position: 'bottom', fontSize: 8, fill: '#007d00',
                    formatter: (v: number) => v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M' : '' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  )
}
function LinhasReceita({ opts }: { opts: string[] }) { return <CollapsibleCard title="Linhas de Receita" color="green"><C8 opts={opts} /></CollapsibleCard> }

// ════════════════════════════════════════════════════════════════
// 9 — Todos Produtos
// ════════════════════════════════════════════════════════════════
const ALL_PR: [keyof TPRow, string, boolean?, boolean?][] = [
  ['gmv','GMV'], ['tpv_sub','TPV Sub Adq.'], ['tpv_gtw','TPV Gateway'], ['tpv_boleto','TPV Boleto'],
  ['tpv_pix','TPV Pix'], ['tpv_cartao','TPV Cartão'], ['net_mdr','NetMDR'], ['net_mdr_pct','NetMDR%',true],
  ['floating','Floating'], ['floating_pct','Floating%',true], ['rcta_pix_pagarme','Rcta. Pix Pagarme'],
  ['rcta_pix_pos','Rcta. Pix POS'], ['rcta_pix_total','Rcta. Pix Total'], ['pix_pct','Pix%',true],
  ['gross_rav','GrossValue'], ['rcta_rav','Rcta. RAV'], ['cof','COF'], ['mrg_rav','Margem RAV'],
  ['mrg_rav_pct','Margem RAV%',true], ['tx_simples','Taxa Simples',true], ['duration_dc','Duration (DC)',false,true],
  ['aluguel','Aluguel'], ['aluguel_pct','Aluguel%',true], ['rcta_boleto','Rcta. Boleto'],
  ['rcta_gateway','Rcta. Gateway'], ['rcta_antifraude','Rcta. Antifraude'], ['rcta_transf','Rcta. Transferência'],
  ['rcta_setup','Rcta. Setup'], ['receita_ncof','Receita NetCOF'], ['tkr_ncof','Take Rate nCOF',true],
  ['margem','Margem'], ['margem_gmv','Margem/GMV',true],
]

function C9({ opts, mesOpts }: { opts: string[]; mesOpts: string[] }) {
  const { data, loading, run } = useGASLazy<TPRow>('getEnterpriseTodosProdutos')
  const [gqs, setGqs] = useState<string[]>([])
  const [mq, setMq] = useState<string[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set(ALL_PR.map(([k]) => k as string)))
  const [showPicker, setShowPicker] = useState(false)
  useEffect(() => { run() }, []) // eslint-disable-line
  const applyFilters = (g: string[], m: string[]) => run({ grupos: g.length > 0 ? g : undefined, meses: m.length > 0 ? m : undefined })

  const vis = ALL_PR.filter(([k]) => sel.has(k as string))
  const toggle = (k: string) => setSel(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const fc = (ip?: boolean, ir?: boolean, v?: string) => {
    if (!v) return ''
    if (ir) { const n = parseFloat(v); return n ? N(n, 0) + 'd' : '' }
    if (ip) return pct(v)
    return mi(v)
  }
  const exportData = data ? vis.map(([k, l]) => {
    const obj: Record<string, string> = { metrica: l as string }
    data.forEach(d => { obj[d.mes] = d[k] || '' })
    return obj
  }) : []

  return (
    <>
      <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <GS vals={gqs} onChange={v => { setGqs(v); applyFilters(v, mq) }} opts={opts} />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#505a50] whitespace-nowrap">Mês:</span>
          <div className="flex-1"><MultiCombo opts={mesOpts} vals={mq} onChange={v => { setMq(v); applyFilters(gqs, v) }} /></div>
        </div>
      </div>
      {loading && <Sk rows={10} cols={8} />}
      {!loading && data && data.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] text-[#505a50]">{sel.size}/{ALL_PR.length} métricas</span>
            <div className="flex gap-2">
              <ExportBtn data={exportData as any} name="enterprise_todos_produtos" />
              <button onClick={() => setShowPicker(!showPicker)}
                className="px-3 py-1 text-xs font-semibold bg-[#f5fff5] border border-[#c8d2c8] rounded-full text-[#00461e] hover:bg-[#e8f0e8]">
                ⚙ Métricas
              </button>
            </div>
          </div>
          {showPicker && (
            <div className="mb-3 p-3 bg-[#f5fff5] rounded-xl border border-[#c8d2c8] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
              {ALL_PR.map(([k, l]) => (
                <label key={k as string} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={sel.has(k as string)} onChange={() => toggle(k as string)} className="accent-[#00461e]" />
                  <span className="text-xs text-[#1e281e]">{l}</span>
                </label>
              ))}
            </div>
          )}
          <div className="overflow-auto rounded-lg border border-[#e8f0e8]" style={{ maxHeight: '480px', ...TF }}>
            <table className="w-full text-xs">
              <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
                <th className="px-3 py-2 text-left font-semibold text-[#00461e] sticky left-0 bg-[#f5fff5] min-w-[160px] text-[11px]">Métrica</th>
                {data.map(d => <th key={d.mes} className="px-2 py-2 text-right font-semibold text-[#505a50] whitespace-nowrap text-[11px]">{d.mes}</th>)}
              </tr></thead>
              <tbody>{vis.map(([k, l, ip, ir]) => (
                <tr key={k as string} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                  <td className="px-3 py-1.5 font-medium text-[#1e281e] sticky left-0 bg-white text-xs">{l}</td>
                  {data.map(d => {
                    const v = d[k]
                    return <td key={d.mes} className={`px-2 py-1.5 text-right font-sans text-xs ${neg(v) ? 'text-[#d70000]' : 'text-[#1e281e]'}`}>{fc(ip, ir, v)}</td>
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
function TodosProdutos({ opts, mesOpts }: { opts: string[]; mesOpts: string[] }) { return <CollapsibleCard title="Todos Produtos" color="green"><C9 opts={opts} mesOpts={mesOpts} /></CollapsibleCard> }

// ════════════════════════════════════════════════════════════════
// 10 — Afiliações e Documentos
// ════════════════════════════════════════════════════════════════
function C10({ opts }: { opts: string[] }) {
  // Lazy: só carrega ao selecionar um grupo
  const { data, loading, error, run } = useGASLazy<AfilRow>('getEnterpriseAfiliacoes')
  const [gqs, setGqs] = useState<string[]>([])
  const [page, setPage] = useState(0)
  useEffect(() => setPage(0), [gqs])

  // getEnterpriseAfiliacoes não tem filtro server-side por grupo — client-side é suficiente
  const filtered = (data || []).filter(r => gqs.length === 0 || gqs.includes(r.grupo))
  const paginated = filtered.slice(page * PG, (page + 1) * PG)
  const thC = "px-2 py-2 text-right font-semibold text-[#505a50] text-[11px] whitespace-nowrap"

  return (
    /* min-h garante espaço para o dropdown do MultiCombo sem ser cortado pelo overflow-hidden do CollapsibleCard */
    <div className="min-h-[260px]">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1"><GS vals={gqs} onChange={v => { setGqs(v); if (v.length && !data) run() }} opts={opts} /></div>
        <ExportBtn data={filtered as any} name="enterprise_afiliações" />
      </div>
      {!gqs.length && !data && <p className="text-xs text-[#96a096] py-4 text-center">Selecione um Grupo Marca para carregar as afiliações.</p>}
      {gqs.length > 0 && loading && <Sk rows={7} cols={7} />}
      {error && <p className="text-xs text-[#d70000] py-3">Erro: {error}</p>}
      {!loading && !error && data && (
        <>
          <div className="overflow-x-auto">
            <ST>
              <table className="text-xs" style={{ ...TF, minWidth: '700px' }}>
                <thead><tr className="bg-[#f5fff5] sticky top-0 z-10">
                  <th className="px-3 py-2 text-left font-semibold text-[#00461e] sticky left-0 bg-[#f5fff5] min-w-[130px] text-[11px]">Grupo</th>
                  <th className="px-2 py-2 text-left font-semibold text-[#505a50] text-[11px] min-w-[120px]">Afiliação</th>
                  <th className="px-2 py-2 text-left font-semibold text-[#505a50] text-[11px] min-w-[130px]">Documento</th>
                  <th className="px-2 py-2 text-left font-semibold text-[#505a50] text-[11px] min-w-[80px]">MCC</th>
                  <th className="px-2 py-2 text-left font-semibold text-[#505a50] text-[11px] min-w-[120px]">Categoria</th>
                  <th className={thC}>Avg TPV 3m</th>
                  <th className={thC}>Avg Rcta. nCOF 3m</th>
                </tr></thead>
                <tbody>{paginated.map((row, i) => (
                  <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                    <td className="px-3 py-1.5 font-medium text-[#1e281e] sticky left-0 bg-white max-w-[130px] truncate text-xs" title={row.grupo}>{row.grupo}</td>
                    <td className="px-2 py-1.5 text-xs text-[#505a50] font-sans">{row.afiliacao}</td>
                    <td className="px-2 py-1.5 text-xs text-[#505a50] font-sans">{row.documento}</td>
                    <td className="px-2 py-1.5 text-xs text-[#505a50]">{row.mcc}</td>
                    <td className="px-2 py-1.5 text-xs text-[#505a50]">{row.categoria}</td>
                    <td className={tdC(row.avg_tpv_3m)}>{mi(row.avg_tpv_3m)}</td>
                    <td className={tdC(row.avg_ncof_3m)}>{mi(row.avg_ncof_3m)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </ST>
          </div>
          <Pg page={page} total={filtered.length} onChange={setPage} />
        </>
      )}
    </div>
  )
}
function AfiliacoesCard({ opts }: { opts: string[] }) { return <CollapsibleCard title="Afiliações e Documentos" color="green"><C10 opts={opts} /></CollapsibleCard> }

// ════════════════════════════════════════════════════════════════
// Enterprise — Página
// ════════════════════════════════════════════════════════════════
export default function Enterprise() {
  // opts para os demais cards (Visão 3M, RAV, etc.) — carga leve de grupos/meses
  const { data: ro } = useGAS<FiltOpt>('getEnterpriseFilterOptions')
  const opts: Record<string, string[]> = {}
  if (ro) { for (const { tipo, valor } of ro) { if (!opts[tipo]) opts[tipo] = []; opts[tipo].push(valor) } }
  // FilterBar (Base Geral) gerencia suas próprias opções internamente com cascading
  // activeFilters: filtros aplicados pelo FilterBar, passados ao CardCreditoLifetime (server-side query sem LIMIT 500)
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})

  return (
    <div>
      {/* Hero — mesmo padrão da Home */}
      <AnimatedHero className="px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span>Acompanhamentos</span><span>·</span><span>Carteiras</span><span>·</span>
            <span className="font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Enterprise</span>
          </div>
          <h1
            className="font-extrabold leading-[1.05] mb-4"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'white' }}
          >
            Enterprise
          </h1>
          <p className="text-base max-w-xl leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
            <span className="font-bold">Carteira: Acompanhamentos</span><br />
            Visão mensal, grupos e detalhes transacionais.
          </p>
        </div>
      </AnimatedHero>

      <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="space-y-4">
        <BaseGeral onActiveFilters={setActiveFilters} />
        <CardCreditoLifetime carteira="enterprise" filters={activeFilters} groupOpts={opts.grupo || []} />
        <LinhasReceita opts={opts.grupo || []} />
        <Visao3M opts={opts.grupo || []} />
        <TransacionalCartao opts={opts.grupo || []} />
        <RAVCard opts={opts.grupo || []} mesOpts={opts.mes || []} />
        <ModalidadeCard opts={opts} />
        <MetricasCliente opts={opts.grupo || []} mesOpts={opts.mes || []} />
        <TodosProdutos opts={opts.grupo || []} mesOpts={opts.mes || []} />
        <AfiliacoesCard opts={opts.grupo || []} />
      </div>
      <div className="mt-10 pb-4 text-center text-[11px] text-[#96a096]">
        Mesa Banco · Pricing Operações
      </div>
      </div>
    </div>
  )
}
