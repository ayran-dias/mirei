import { useState, useRef, useEffect, useMemo } from 'react'
import type { StatusCreditoRow } from '../types'
import { TableSkeleton } from './Skeleton'
import CollapsibleCard from './CollapsibleCard'

const fmt = (v: string | null) => {
  if (!v || v === 'null' || v === 'None') return '—'
  const n = parseFloat(v)
  if (!isNaN(n) && v.includes('.')) return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return v
}

const fmtDate = (v: string | null) => {
  if (!v || v === 'null') return '—'
  try {
    // BQ Advanced Service retorna timestamps como epoch seconds em notação científica (ex: "1.729285200E9")
    const n = parseFloat(v)
    if (!isNaN(n) && n > 1e9 && n < 2e10) {
      return new Date(n * 1000).toLocaleDateString('pt-BR')
    }
    // Formato ISO ou date string normal
    const d = new Date(v)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('pt-BR')
  } catch { return v }
}

const fmtPct = (v: string | null) => {
  if (!v || v === 'null') return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return v
  return (n * 100).toFixed(2) + '%'
}

const faixaColor = (faixa: string | null) => {
  if (!faixa || faixa === '—' || faixa === 'Em dia') return 'text-emerald-600'
  if (faixa.includes('1 a') || faixa.includes('15')) return 'text-amber-600'
  return 'text-red-500'
}

function StatusFilter({ allStatuses, hidden, setHidden }: { allStatuses: string[]; hidden: Set<string>; setHidden: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (s: string) => {
    const next = new Set(hidden)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    setHidden(next)
  }

  const visibleCount = allStatuses.length - hidden.size

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-3 py-1.5 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Status ({visibleCount}/{allStatuses.length})
        {hidden.size > 0 && (
          <span className="bg-amber-100 text-amber-700 px-1.5 rounded-full text-[10px] font-semibold">{hidden.size} ocultos</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg p-3 w-52">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-600">Filtrar por status</span>
            <button onClick={() => setHidden(new Set())} className="text-[10px] text-blue-600 hover:underline">Mostrar todos</button>
          </div>
          {allStatuses.map(s => (
            <label key={s} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 px-1 rounded">
              <input type="checkbox" checked={!hidden.has(s)} onChange={() => toggle(s)} className="rounded border-gray-300" />
              <span className="text-xs text-gray-700">{s}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  data: StatusCreditoRow[] | null
  status: string
  defaultOpen?: boolean
}

export default function OfertasCredito({ data, status, defaultOpen = false }: Props) {
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set(['Cancelled', 'Denied']))
  if (status === 'loading') return (
    <CollapsibleCard title="Ofertas de Crédito" color="blue" defaultOpen={defaultOpen}><TableSkeleton rows={4} /></CollapsibleCard>
  )

  if (status === 'error' || !data || data.length === 0) return (
    <CollapsibleCard title="Ofertas de Crédito" color="blue" defaultOpen={defaultOpen}><p className="text-gray-400 text-sm">Sem dados</p></CollapsibleCard>
  )

  const first = data[0]

  // Deduplicate ofertas by offer_id
  const ofertasMap = new Map<string, StatusCreditoRow>()
  data.forEach(r => { if (r.offer_id) ofertasMap.set(r.offer_id, r) })
  const ofertas = Array.from(ofertasMap.values())

  return (
    <CollapsibleCard title="Ofertas de Crédito" color="blue" defaultOpen={defaultOpen}>
      <div className="space-y-6">

      {/* Cartao */}
      {first.documento_dono && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Cartao</h4>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left text-gray-600 font-semibold">Doc Dono</th>
                  <th className="px-3 py-2.5 text-left text-gray-600 font-semibold">Doc Usuario</th>
                  <th className="px-3 py-2.5 text-right text-gray-600 font-semibold">Limite Concedido</th>
                  <th className="px-3 py-2.5 text-right text-gray-600 font-semibold">Limite Disponivel</th>
                  <th className="px-3 py-2.5 text-right text-gray-600 font-semibold">Colateral</th>
                  <th className="px-3 py-2.5 text-left text-gray-600 font-semibold">Faixa de Atraso</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2.5">{first.documento_dono}</td>
                  <td className="px-3 py-2.5">{first.documento_usuario || '—'}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(first.limite_concedido)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(first.limite_disponivel)}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(first.limite_concedido_collateral)}</td>
                  <td className={`px-3 py-2.5 font-medium ${faixaColor(first.faixa_atraso)}`}>{first.faixa_atraso || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demais Ofertas */}
      {ofertas.length > 0 && (() => {
        const allStatuses = Array.from(new Set(ofertas.map(r => r.offer_status || '—').filter(Boolean))).sort()
        const filtered = ofertas
          .filter(r => !hiddenStatuses.has(r.offer_status || '') && !hiddenStatuses.has(r.negotiation_status || ''))
          .sort((a, b) => {
            const da = parseFloat(a.offer_expiration_date || '0')
            const db = parseFloat(b.offer_expiration_date || '0')
            return db - da
          })
        return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Demais Ofertas</h4>
            <StatusFilter allStatuses={allStatuses} hidden={hiddenStatuses} setHidden={setHiddenStatuses} />
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Status</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Expiracao</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Aprovacao</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Negociacao</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Proposta</th>
                  <th className="px-2 py-2.5 text-right text-gray-600 font-semibold">Rating</th>
                  <th className="px-2 py-2.5 text-right text-gray-600 font-semibold">Desembolso</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Data Desemb.</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Canal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-2 py-2">{r.offer_status || '—'}</td>
                    <td className="px-2 py-2">{fmtDate(r.offer_expiration_date)}</td>
                    <td className="px-2 py-2">{r.approval_status || '—'}</td>
                    <td className="px-2 py-2">{r.negotiation_status || '—'}</td>
                    <td className="px-2 py-2">{r.proposal_status || '—'}</td>
                    <td className="px-2 py-2 text-right">{r.offer_rating ? parseFloat(r.offer_rating).toFixed(0) : '—'}</td>
                    <td className="px-2 py-2 text-right">{fmt(r.disbursement_value)}</td>
                    <td className="px-2 py-2">{fmtDate(r.disbursement_date)}</td>
                    <td className="px-2 py-2">{r.product_sales_channel || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <p className="text-gray-400 text-xs mt-2">Nenhuma oferta com os filtros selecionados</p>}
        </div>
        )
      })()}

      {/* Desembolso (contratos ativos) */}
      {ofertas.some(r => r.faixa_atraso_credito_ativo) && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Desembolso</h4>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-2.5 text-right text-gray-600 font-semibold">Desembolso</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Data</th>
                  <th className="px-2 py-2.5 text-right text-gray-600 font-semibold">Tx. Juros</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Vencimento</th>
                  <th className="px-2 py-2.5 text-right text-gray-600 font-semibold">Parcelas</th>
                  <th className="px-2 py-2.5 text-left text-gray-600 font-semibold">Faixa Atraso</th>
                  <th className="px-2 py-2.5 text-right text-gray-600 font-semibold">Rating Cont.</th>
                </tr>
              </thead>
              <tbody>
                {ofertas.filter(r => r.faixa_atraso_credito_ativo).sort((a, b) => {
                  const da = parseFloat(a.disbursement_date || '0')
                  const db = parseFloat(b.disbursement_date || '0')
                  return db - da
                }).map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-2 py-2 text-right">{fmt(r.disbursement_value)}</td>
                    <td className="px-2 py-2">{fmtDate(r.disbursement_date)}</td>
                    <td className="px-2 py-2 text-right">{fmtPct(r.tx_juros_mes__credito_ativo)}</td>
                    <td className="px-2 py-2">{fmtDate(r.data_vencimento_credito_ativo)}</td>
                    <td className="px-2 py-2 text-right">{r.qtd_parcelas_credito_ativo || '—'}</td>
                    <td className={`px-2 py-2 font-medium ${faixaColor(r.faixa_atraso_credito_ativo)}`}>
                      {r.faixa_atraso_credito_ativo || '—'}
                    </td>
                    <td className="px-2 py-2 text-right">{r.rating_contabilidade_credito_ativo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </CollapsibleCard>
  )
}
