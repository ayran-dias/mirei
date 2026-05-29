import { useState, useEffect } from 'react'
import type { Afiliacao360 } from '../types'
import { CardSkeleton } from './Skeleton'

interface Props {
  data: Afiliacao360[] | null
  status: string
}

const v = (s: string | null | undefined) => (!s || s === 'null' || s === 'None') ? null : s
const d = (s: string | null | undefined): string => v(s) ?? '—'
const bool = (s: string | null | undefined) => s === 'true' || s === 'True'
const fmtDate = (s: string | null | undefined): string => {
  const val = v(s); if (!val) return '—'
  try {
    const n = parseFloat(val)
    if (!isNaN(n) && n > 1e8) {
      const d = new Date(n * 1000)
      return d.toLocaleDateString('pt-BR')
    }
    const parts = val.split('T')[0].split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return val
  } catch { return val }
}
const fmtMonthYear = (s: string | null | undefined): string => {
  const val = v(s); if (!val) return '—'
  try {
    const parts = val.split('T')[0].split('-')
    if (parts.length === 3) return `${parts[1]}/${parts[0]}`
    return val
  } catch { return val }
}
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

function Badge({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
      on
        ? 'bg-[#e6f7ee] text-[#00461e] border-[#a3d9b3]'
        : 'bg-gray-50 text-gray-400 border-gray-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-[#00d700]' : 'bg-gray-300'}`} />
      {label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-[#00461e]/50 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  )
}

function Row({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2 py-0.5">
      <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">{label}</span>
      <span className={`text-[12px] text-gray-800 font-medium text-right ${className}`}>{value}</span>
    </div>
  )
}

function TempoBar({ label, meses, inicio, color }: { label: string; meses: string | null; inicio: string | null; color: string }) {
  const m = meses ? parseInt(meses) : null
  const width = m ? Math.min(100, (m / 120) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-gray-500 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, backgroundColor: color }} />
        </div>
      </div>
      <span className="text-[11px] font-semibold text-gray-700 w-16 text-right flex-shrink-0">
        {m ? `${m}m` : '—'}
      </span>
      <span className="text-[10px] text-gray-400 w-16 text-right flex-shrink-0">{fmtMonthYear(inicio)}</span>
    </div>
  )
}

function AfiliacoesRow({ qtd, affiliations }: { qtd: string | null; affiliations: string | null }) {
  const [open, setOpen] = useState(false)

  const parsed = affiliations
    ? affiliations.split(';').map(s => {
        const [stonecode, company, status, data_cred] = s.split('|')
        return { stonecode, company, status, data_cred }
      })
    : []

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <div className="flex justify-between items-baseline gap-2 py-0.5">
        <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">Afiliações</span>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-gray-800 font-medium">{d(qtd)}</span>
          {parsed.length > 0 && (
            <button
              onClick={() => setOpen(true)}
              className="text-[10px] font-semibold text-[#00461e] border border-[#00461e]/30 bg-[#f5fff5] hover:bg-[#e6f7ee] px-2 py-0.5 rounded-full transition-colors"
            >
              ver
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-[#c8d2c8] w-full max-w-xl mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#00461e] px-5 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Afiliações ({parsed.length})</h3>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f5fff5] border-b border-[#c8d2c8]">
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Stonecode</th>
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Empresa</th>
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-left text-[#505a50] font-semibold">Credenciamento</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((a, i) => (
                    <tr key={i} className="border-b border-[#e8f0e8] hover:bg-[#f5fff5]">
                      <td className="px-4 py-2 font-mono text-[11px] text-gray-600">{a.stonecode ?? '—'}</td>
                      <td className="px-4 py-2 font-medium">{a.company ?? '—'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status === 'APROVADO' ? 'bg-[#e6f7ee] text-[#00461e]' : 'bg-red-50 text-red-600'
                        }`}>
                          {a.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{fmtDate(a.data_cred) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function InfoCliente({ data, status }: Props) {
  const [open, setOpen] = useState(false)

  const isLoading = status === 'loading'
  const r = data && data.length > 0 ? data[0] : null

  const statusColor = (s: string | null) => {
    if (!s) return 'bg-gray-100 text-gray-500'
    if (s === 'APROVADO') return 'bg-[#e6f7ee] text-[#00461e]'
    return 'bg-yellow-50 text-yellow-700'
  }

  const engajColor = (s: string | null) => {
    if (!s) return 'bg-gray-100 text-gray-500'
    if (s.toLowerCase().includes('ativo')) return 'bg-[#e6f7ee] text-[#00461e]'
    return 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#c8d2c8] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full bg-[#00461e] px-6 py-3 flex items-center justify-between hover:bg-[#00461e]/90 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg
            className={`w-4 h-4 text-white/60 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-0' : '-rotate-90'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <h3 className="font-semibold text-white text-sm">Informações do Cliente</h3>
          {r && (
            <span className="text-white/80 text-sm font-medium truncate max-w-[200px]">
              · {d(r.trade_name)}
            </span>
          )}
        </div>
        {r && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {v(r.status_affiliation) && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(r.status_affiliation)}`}>
                {r.status_affiliation}
              </span>
            )}
            {v(r.status_engajamento) && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${engajColor(r.status_engajamento)}`}>
                {r.status_engajamento}
              </span>
            )}
            {(v(r.cidade) || v(r.uf)) && (
              <span className="text-[11px] text-white/60">
                {[capitalize(d(r.cidade)), d(r.uf)].filter(x => x !== '—').join(', ') || '—'}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="px-6 pb-6 pt-4">
          {isLoading && <CardSkeleton />}
          {!isLoading && !r && <p className="text-gray-400 text-sm">Sem dados</p>}
          {!isLoading && r && (
            <div className="space-y-5">
              {v(r.updated_at) && (
                <p className="text-[11px] text-gray-400 -mt-1">
                  Dados atualizados em {fmtDate(r.updated_at)}
                </p>
              )}

              {/* Row 1: Identificação + Tempo + Engajamento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Identificação */}
                <Section title="Identificação">
                  <div className="space-y-0.5">
                    <Row label="Documento" value={d(r.document)} />
                    <Row label="Razão Social" value={d(r.legal_name)} />
                    <Row label="Tipo" value={d(r.document_type)} />
                    <AfiliacoesRow qtd={r.qtd_stonecodes} affiliations={r.affiliations} />
                    <Row label="Empresas" value={d(r.companies)} />
                    <Row label="MCC" value={v(r.mcc_id) ? `${r.mcc_id} · ${d(r.mcc_name)}` : d(r.mcc_name)} />
                    <Row label="Domicílio" value={d(r.domicilio_bancario)} />
                    <Row label="Canal" value={d(r.channel)} />
                    <Row label="Sales Force" value={d(r.main_sales_force)} />
                  </div>
                </Section>

                {/* Tempo com a Stone */}
                <Section title="Tempo com a Stone">
                  <div className="space-y-2.5 mt-1">
                    <TempoBar label="Adquirência" meses={r.meses_adquirencia} inicio={r.inicio_adquirencia} color="#00461e" />
                    <TempoBar label="Banking" meses={r.meses_banking} inicio={r.inicio_banking} color="#00d700" />
                    <TempoBar label="Digital" meses={r.meses_digital} inicio={r.inicio_digital} color="#6ee7b7" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Barra: proporção de 120 meses</p>
                </Section>

                {/* Engajamento */}
                <Section title="Engajamento">
                  <div className="space-y-0.5">
                    <Row label="Status" value={d(r.status_engajamento)}
                      className={r.status_engajamento?.toLowerCase().includes('ativo') ? 'text-[#00461e] font-bold' : 'text-red-600 font-bold'} />
                    <Row label="Última transação" value={fmtDate(r.ultima_trx_adquirencia)} />
                    <Row label="Dias sem transacionar" value={d(r.dias_sem_transacionar)} />
                    <Row label="Meses ativos Adq (12m)" value={d(r.meses_ativos_adq_12m)} />
                    <Row label="Último mês Banking ativo" value={fmtMonthYear(r.ultimo_mes_banking_ativo)} />
                    <Row label="Meses ativos Banking (12m)" value={d(r.meses_banking_ativos_12m)} />
                  </div>
                </Section>
              </div>

              <div className="border-t border-[#e8f0e8]" />

              {/* Row 2: Produtos + Grupo + Preços */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Produtos */}
                <Section title={`Produtos Ativos (${d(r.qtd_produtos_ativos)})`}>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <Badge on={bool(r.tem_mdr_cartao)} label="MDR Cartão" />
                    <Badge on={bool(r.tem_rav)} label="RAV" />
                    <Badge on={bool(r.tem_pix_adquirencia)} label="Pix Adq" />
                    <Badge on={bool(r.tem_link_pagamento)} label="Link Pagamento" />
                    <Badge on={bool(r.tem_gateway)} label="Gateway" />
                    <Badge on={bool(r.tem_boleto)} label="Boleto" />
                    <Badge on={bool(r.tem_pagarme)} label="Pagar.me" />
                    <Badge on={bool(r.tem_conta_banking)} label="Conta" />
                    <Badge on={bool(r.tem_pix_banking)} label="Pix Banking" />
                    <Badge on={bool(r.tem_transferencia)} label="Transferência" />
                    <Badge on={bool(r.tem_seguro)} label="Seguro" />
                  </div>
                </Section>

                {/* Grupo Econômico */}
                <Section title="Grupo Econômico">
                  {bool(r.pertence_a_grupo) ? (
                    <div className="space-y-0.5">
                      <Row label="Pertence a grupo" value="Sim" className="text-[#00461e] font-bold" />
                      <Row label="Nome" value={d(r.grupo_nome)} />
                      <Row label="Tipo" value={d(r.grupo_tipo)} />
                      <Row label="Docs no grupo" value={d(r.qtd_docs_no_grupo)} />
                    </div>
                  ) : (
                    <p className="text-[12px] text-gray-400 mt-1">Não pertence a grupo econômico</p>
                  )}
                </Section>

                {/* Preços */}
                <Section title="Preços & Ofertas">
                  <div className="space-y-0.5">
                    <Row label="Última alter. preço" value={fmtDate(r.ultima_alteracao_preco)} />
                    <Row label="Última renegociação" value={fmtDate(r.ultima_renegociacao)} />
                    <Row label="Última atualiz. oferta" value={fmtDate(r.ultima_atualizacao_oferta)} />
                    {v(r.tier) && <Row label="Tier" value={d(r.tier)} />}
                  </div>
                </Section>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  )
}
