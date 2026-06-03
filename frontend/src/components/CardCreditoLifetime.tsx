/**
 * CardCreditoLifetime.tsx — Card "Credito: Lifetime (VP)"
 * Reutilizavel em Enterprise e GruposMarca.
 * Recebe carteira + filters, chama getCreditoLifetimeSummary/Detail no GAS.
 * Summary: aggregado total (sem LIMIT 500).
 * Detail: paginado server-side (20 por vez, botao "Ver mais").
 */
import { exportToXlsx } from '../utils/exportXlsx'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import CollapsibleCard from './CollapsibleCard'

interface CreditoSummary {
  nii: string
  risk_adj_nii: string
  npv: string
  doc_count: string
}
interface CreditoDetail {
  documento: string
  motivo?: string
  nii: string
  risk_adj_nii: string
  npv: string
}

interface Props {
  carteira: 'enterprise' | 'gm'
  filters: Record<string, string[]>
  groupOpts?: string[]  // opções de grupo vindas da página pai
}

// ── GroupFilter — dropdown suspenso (mesmo padrão MultiCombo) ──
function GroupFilter({
  opts,
  vals,
  onChange,
}: {
  opts: string[]
  vals: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = opts.filter(o => o.toLowerCase().includes(q.toLowerCase())).slice(0, 80)
  const toggle = (o: string) => onChange(vals.includes(o) ? vals.filter(v => v !== o) : [...vals, o])
  const label = vals.length === 0 ? 'Todos os grupos' : vals.length === 1 ? vals[0] : `${vals.length} grupos selecionados`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1 text-xs border border-[#c8d2c8] rounded-lg bg-white focus:outline-none focus:border-[#00461e] text-left"
      >
        <span className={vals.length > 0 ? 'text-[#1e281e] font-semibold truncate' : 'text-[#c8d2c8]'}>{label}</span>
        <span className="text-[#96a096] ml-1 shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-[#c8d2c8] rounded-xl shadow-xl z-50 min-w-[220px] w-full max-h-56 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-[#f0f4f0] px-3 py-1.5 flex items-center gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..."
              className="flex-1 text-xs outline-none placeholder-[#c8d2c8]" />
            {vals.length > 0 && (
              <button onClick={() => onChange([])} className="text-[10px] text-[#96a096] hover:text-[#505a50] whitespace-nowrap">
                Limpar ({vals.length})
              </button>
            )}
          </div>
          {filtered.map(o => (
            <label key={o} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f5fff5] cursor-pointer">
              <input type="checkbox" checked={vals.includes(o)} onChange={() => toggle(o)} className="accent-[#00461e]" />
              <span className="text-xs text-[#1e281e] truncate">{o}</span>
            </label>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-xs text-[#96a096]">Sem resultados</div>}
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────
const N = (n: number, d: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

const fmtBRL = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return ''
  const a = Math.abs(n)
  if (a >= 1e9) return 'R$ ' + N(n / 1e9, 2) + 'B'
  if (a >= 1e6) return 'R$ ' + N(n / 1e6, 2) + 'M'
  if (a >= 1e3) return 'R$ ' + N(n / 1e3, 2) + 'K'
  return 'R$ ' + N(n, 2)
}

const npvColor = (v: string) => {
  const n = parseFloat(v)
  if (isNaN(n) || n === 0) return 'text-[#1e281e]'
  return n > 0 ? 'text-[#007d00]' : 'text-[#d70000]'
}

const PAGE_SIZE = 20

// ── Export XLSX (SheetJS — arquivo .xlsx real, sem aviso de formato) ──────────
function exportXLS(rows: CreditoDetail[], filename: string) {
  if (!rows.length) return
  const headers = [
    { key: 'documento', label: 'Documento' },
    { key: 'motivo',    label: 'Grupo' },
    { key: 'nii',       label: 'NII' },
    { key: 'risk_adj_nii', label: 'Risk-Adj NII' },
    { key: 'npv',       label: 'NPV' },
  ]
  exportToXlsx(rows as unknown as Record<string, any>[], headers, filename)
}

// Serialize filters to stable key for comparison
function filtersKey(f: Record<string, string[]>): string {
  return Object.keys(f).sort().map(k => k + ':' + [...(f[k] || [])].sort().join(',')).join('|')
}

// ── Component ──────────────────────────────────────────────────
export default function CardCreditoLifetime({ carteira, filters, groupOpts }: Props) {
  // Local group filter state
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  // Merge local group filter with parent filters
  const mergedFilters = useMemo(() => {
    if (!selectedGroups.length) return filters
    return { ...filters, grupos: selectedGroups }
  }, [filters, selectedGroups])

  // Summary state
  const [summary, setSummary] = useState<CreditoSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // Detail state (lazy, paginated)
  const [detail, setDetail] = useState<CreditoDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailOpened, setDetailOpened] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)

  // Detail sort state (default: BQ order = npv desc; user click overrides)
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

  const prevFilterKey = useRef<string | null>(null) // null garante fetch no mount mesmo com filters={}
  const carteiraKey = carteira === 'gm' ? 'gm' : 'enterprise'

  // ── Fetch Summary ──
  const fetchSummary = useCallback(() => {
    if (typeof google === 'undefined' || !(google as any).script?.run) return
    setSummaryLoading(true)
    setSummaryError(null)

    // Timeout: GAS silenciosamente mata o script em 6 min sem chamar handlers
    const timeout = setTimeout(() => {
      setSummaryLoading(false)
      setSummaryError('Tempo limite excedido. A query de crédito pode estar sobrecarregada — tente novamente.')
    }, 5 * 60 * 1000)

    ;(google as any).script.run
      .withSuccessHandler((result: CreditoSummary) => {
        clearTimeout(timeout)
        setSummary(result)
        setSummaryLoading(false)
      })
      .withFailureHandler((e: { message: string }) => {
        clearTimeout(timeout)
        setSummaryError(e.message)
        setSummaryLoading(false)
      })
      .getCreditoLifetimeSummary(carteiraKey, mergedFilters)
  }, [carteiraKey, mergedFilters])

  // ── Fetch Detail page ──
  const fetchDetailPage = useCallback((offset: number, append: boolean) => {
    if (typeof google === 'undefined' || !(google as any).script?.run) return
    setDetailLoading(true)
    setDetailError(null)

    const timeout = setTimeout(() => {
      setDetailLoading(false)
      setDetailError('Tempo limite excedido. Tente novamente.')
    }, 5 * 60 * 1000)

    ;(google as any).script.run
      .withSuccessHandler((rows: CreditoDetail[]) => {
        clearTimeout(timeout)
        if (append) {
          setDetail(prev => [...prev, ...rows])
        } else {
          setDetail(rows)
        }
        setHasMore(rows.length >= PAGE_SIZE)
        offsetRef.current = offset + rows.length
        setDetailLoading(false)
      })
      .withFailureHandler((e: { message: string }) => {
        clearTimeout(timeout)
        setDetailError(e.message)
        setDetailLoading(false)
      })
      .getCreditoLifetimeDetail(carteiraKey, mergedFilters, PAGE_SIZE, offset)
  }, [carteiraKey, mergedFilters])

  // Re-fetch summary when filters change (including local group filter)
  useEffect(() => {
    const key = filtersKey(mergedFilters)
    if (key === prevFilterKey.current) return
    prevFilterKey.current = key
    // Reset detail when filters change
    setDetail([])
    offsetRef.current = 0
    setHasMore(true)
    setDetailOpened(false)
    // Always fetch summary
    fetchSummary()
  }, [mergedFilters, fetchSummary])

  // Load first detail page when user opens the detail section
  const handleOpenDetail = () => {
    if (!detailOpened) {
      setDetailOpened(true)
      fetchDetailPage(0, false)
    }
  }

  const handleLoadMore = () => {
    fetchDetailPage(offsetRef.current, true)
  }

  // Sorted detail rows (frontend only — overrides BQ default npv desc order on click)
  const sortedDetail = useMemo(() => {
    if (!sortCol) return detail
    return [...detail].sort((a, b) => {
      const STRING_COLS = new Set(['documento', 'motivo'])
      if (STRING_COLS.has(sortCol)) {
        const sa = String(a[sortCol as keyof CreditoDetail] ?? '').toLowerCase()
        const sb = String(b[sortCol as keyof CreditoDetail] ?? '').toLowerCase()
        return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
      }
      const va = parseFloat(String(a[sortCol as keyof CreditoDetail] ?? ''))
      const vb = parseFloat(String(b[sortCol as keyof CreditoDetail] ?? ''))
      const isNum = !isNaN(va) && !isNaN(vb)
      if (isNum) return sortDir === 'asc' ? va - vb : vb - va
      const sa = String(a[sortCol as keyof CreditoDetail] ?? '').toLowerCase()
      const sb = String(b[sortCol as keyof CreditoDetail] ?? '').toLowerCase()
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
    })
  }, [detail, sortCol, sortDir])

  const docCount = summary ? parseInt(summary.doc_count || '0', 10) : 0
  const TF = { fontFamily: "'Roboto','Manrope',sans-serif" }

  return (
    <CollapsibleCard title="Credito: Lifetime (VP)" color="green">
      {/* Filtro de Grupo — só aparece se houver opções */}
      {groupOpts && groupOpts.length > 0 && (
        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-[#505a50] mb-1 uppercase tracking-wide">
            Grupo
          </label>
          <GroupFilter
            opts={groupOpts}
            vals={selectedGroups}
            onChange={v => { setSelectedGroups(v); setDetail([]); offsetRef.current = 0 }}
          />
        </div>
      )}

      {/* Loading summary */}
      {summaryLoading && (
        <div className="py-6 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#00461e] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#96a096]">Consultando NPV...</span>
        </div>
      )}

      {/* Error */}
      {summaryError && <p className="text-xs text-[#d70000] py-3">Erro: {summaryError}</p>}

      {/* Summary loaded */}
      {!summaryLoading && !summaryError && summary && (
        <div className="space-y-4">
          {/* Summary badges */}
          {(parseFloat(summary.nii) !== 0 || parseFloat(summary.npv) !== 0) ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {([
                  ['NII', summary.nii],
                  ['Risk-Adj NII', summary.risk_adj_nii],
                  ['NPV', summary.npv],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-[#e8f0e8] bg-[#f5fff5] px-4 py-3 text-center">
                    <p className="text-[10px] font-semibold text-[#505a50] uppercase tracking-wide mb-1">{label}</p>
                    <p className={`text-lg font-bold ${npvColor(val)}`}>{fmtBRL(val)}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#96a096] text-center">
                {docCount} documento{docCount !== 1 ? 's' : ''} com contratos de credito
              </p>

              {/* Detail toggle */}
              {!detailOpened && (
                <div className="text-center">
                  <button
                    onClick={handleOpenDetail}
                    className="px-4 py-1.5 text-xs font-semibold text-[#00461e] border border-[#c8d2c8] rounded-full hover:bg-[#f5fff5] transition-colors"
                  >
                    Ver detalhe por documento
                  </button>
                </div>
              )}

              {/* Detail table */}
              {detailOpened && (
                <>
                  {detailError && <p className="text-xs text-[#d70000] py-2">Erro detalhe: {detailError}</p>}

                  {detail.length > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-[#505a50]">
                          Detalhe por Documento ({detail.length}{hasMore ? '+' : ''} de {docCount})
                        </p>
                        <button
                          onClick={() => exportXLS(detail, 'credito_lifetime_vp')}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-[#00461e] border border-[#c8d2c8] rounded-full hover:bg-[#f5fff5] transition-colors"
                        >
                          ⬇ Excel
                        </button>
                      </div>
                      <div className="overflow-auto rounded-lg border border-[#e8f0e8]" style={{ maxHeight: 320, ...TF }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-[#f5fff5] sticky top-0 z-10">
                              {([
                                ['documento', 'Documento', 'text-left text-[#00461e]'],
                                ['motivo',    'Grupo',     'text-left text-[#505a50]'],
                                ['nii',       'NII',       'text-right text-[#505a50]'],
                                ['risk_adj_nii', 'Risk-Adj NII', 'text-right text-[#505a50]'],
                                ['npv',       'NPV',       'text-right text-[#505a50]'],
                              ] as [string, string, string][]).map(([col, label, align]) => (
                                <th
                                  key={col}
                                  onClick={() => handleSort(col)}
                                  className={`px-2 py-2 font-semibold text-[11px] ${align} cursor-pointer select-none hover:bg-[#003d17] transition-colors`}
                                  title="Clique para ordenar"
                                >
                                  <div className={`flex items-center gap-1 ${align.includes('right') ? 'justify-end' : ''}`}>
                                    {label}
                                    {sortCol === col ? (sortDir === 'asc' ? ' ▴' : ' ▾') : ' ⇅'}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedDetail.map((row, i) => (
                              <tr key={i} className="border-b border-[#f0f4f0] hover:bg-[#fafffe]">
                                <td className="px-3 py-1.5 text-xs text-[#505a50] font-sans">{row.documento}</td>
                                <td className="px-2 py-1.5 text-xs text-[#505a50] font-sans">{row.motivo || '—'}</td>
                                <td className={`px-2 py-1.5 text-right font-sans text-xs ${npvColor(row.nii)}`}>{fmtBRL(row.nii)}</td>
                                <td className={`px-2 py-1.5 text-right font-sans text-xs ${npvColor(row.risk_adj_nii)}`}>{fmtBRL(row.risk_adj_nii)}</td>
                                <td className={`px-2 py-1.5 text-right font-sans text-xs ${npvColor(row.npv)}`}>{fmtBRL(row.npv)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {/* Loading indicator for detail */}
                  {detailLoading && (
                    <div className="py-3 flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-[#00461e] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-[#96a096]">Carregando...</span>
                    </div>
                  )}

                  {/* Load more button */}
                  {!detailLoading && hasMore && detail.length > 0 && (
                    <div className="text-center">
                      <button
                        onClick={handleLoadMore}
                        className="px-4 py-1.5 text-xs font-semibold text-[#00461e] border border-[#c8d2c8] rounded-full hover:bg-[#f5fff5] transition-colors"
                      >
                        Ver mais {PAGE_SIZE} docs
                      </button>
                    </div>
                  )}

                  {!detailLoading && detail.length === 0 && !detailError && (
                    <p className="text-xs text-[#96a096] py-2 text-center">
                      Nenhum detalhe encontrado.
                    </p>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-xs text-[#96a096] py-2 text-center">
              Nenhum contrato de credito encontrado para os filtros ativos.
            </p>
          )}
        </div>
      )}

      {/* Initial state — no summary yet and not loading */}
      {!summaryLoading && !summaryError && !summary && (
        <p className="text-xs text-[#96a096] py-4 text-center">
          Aguardando filtros...
        </p>
      )}
    </CollapsibleCard>
  )
}
