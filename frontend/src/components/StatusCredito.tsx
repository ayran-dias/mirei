import type { StatusCreditoRow } from '../types'
import { TableSkeleton } from './Skeleton'

const fmt = (v: string | null) => {
  if (!v || v === 'null' || v === 'None') return '—'
  const n = parseFloat(v)
  if (!isNaN(n) && v.includes('.')) return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return v
}

const fmtDate = (v: string | null) => {
  if (!v || v === 'null') return '—'
  try {
    const d = new Date(v)
    return d.toLocaleDateString('pt-BR')
  } catch { return v }
}

const fmtPct = (v: string | null) => {
  if (!v || v === 'null') return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return v
  return (n * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

const faixaColor = (faixa: string | null) => {
  if (!faixa || faixa === '—' || faixa === 'Em dia') return 'text-emerald-600'
  if (faixa.includes('1 a') || faixa.includes('15')) return 'text-yellow-600'
  return 'text-red-600'
}

function InfoPair({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex">
      <span className="bg-[#00461e] text-white text-xs font-medium px-2 md:px-3 py-1.5 min-w-[110px] md:min-w-[140px] flex-shrink-0">{label}</span>
      <span className={`text-xs px-3 py-1.5 bg-gray-50 flex-1 ${className}`}>{value}</span>
    </div>
  )
}

interface Props {
  data: StatusCreditoRow[] | null
  status: string
}

export default function StatusCredito({ data, status }: Props) {
  if (status === 'loading') return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#c8d2c8] p-6">
      <h3 className="font-semibold text-gray-800 mb-4">Status Crédito</h3>
      <TableSkeleton rows={5} />
    </div>
  )

  if (status === 'error' || !data || data.length === 0) return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#c8d2c8] p-6">
      <h3 className="font-semibold text-gray-800 mb-2">Status Crédito</h3>
      <p className="text-gray-400 text-sm">Sem dados</p>
    </div>
  )

  const first = data[0]

  // Deduplicate ofertas by offer_id
  const ofertasMap = new Map<string, StatusCreditoRow>()
  data.forEach(r => { if (r.offer_id) ofertasMap.set(r.offer_id, r) })
  const ofertas = Array.from(ofertasMap.values())

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#c8d2c8] p-4 md:p-6 space-y-6">
      <h3 className="font-semibold text-gray-800 text-lg">Status Credito</h3>

      {/* Status da Conta + Oferta Safra Atual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Status da Conta</h4>
          <div className="border rounded overflow-hidden space-y-px">
            <InfoPair label="Documento" value={first.CNPJ} />
            <InfoPair label="Status KYC" value={first.kyc_status || '—'} className={first.kyc_status?.includes('Aprovado') ? 'text-emerald-600 font-medium' : 'text-yellow-600'} />
            <InfoPair label="Aprovação KYC" value={fmtDate(first.last_kyc_approved_at)} />
            <InfoPair label="Tipo de conta" value={first.account_type || '—'} />
            <InfoPair label="Rating" value={first.RATING ? parseFloat(first.RATING).toFixed(0) : '—'} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Oferta (safra atual)</h4>
          <div className="border rounded overflow-hidden space-y-px">
            <InfoPair label="Limite KGiro" value={fmt(first.LIMITE_KGIRO_FINAL)} />
            <InfoPair label="Limite Cartão" value={fmt(first.LIMITE_CARTAO_FINAL)} />
            <InfoPair label="Limite GFacil" value={fmt(first.LIMITE_GFACIL_FINAL)} />
            <InfoPair label="Oferta Giro" value={fmt(first.OFERTA_GIRO)} />
            <InfoPair label="Oferta Cartão" value={fmt(first.OFERTA_CARTAO)} />
            <InfoPair label="Oferta Lim. Conta" value={fmt(first.OFERTA_LIMICONTA)} />
          </div>
        </div>
      </div>

      {/* Cartão */}
      {first.documento_dono && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Cartão</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#00461e] text-white">
                  <th className="px-3 py-2 text-left">Doc Dono</th>
                  <th className="px-3 py-2 text-left">Doc Usuário</th>
                  <th className="px-3 py-2 text-right">Limite Concedido</th>
                  <th className="px-3 py-2 text-right">Limite Disponível</th>
                  <th className="px-3 py-2 text-right">Colateral</th>
                  <th className="px-3 py-2 text-left">Faixa de Atraso</th>
                  <th className="px-3 py-2 text-left">Início Rotativo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2">{first.documento_dono}</td>
                  <td className="px-3 py-2">{first.documento_usuario || '—'}</td>
                  <td className="px-3 py-2 text-right">{fmt(first.limite_concedido)}</td>
                  <td className={`px-3 py-2 text-right font-medium ${first.limite_disponivel && parseFloat(first.limite_disponivel) < 0 ? 'text-red-600' : ''}`}>{fmt(first.limite_disponivel)}</td>
                  <td className="px-3 py-2 text-right">{fmt(first.limite_concedido_collateral)}</td>
                  <td className={`px-3 py-2 font-medium ${faixaColor(first.faixa_atraso)}`}>{first.faixa_atraso || '—'}</td>
                  <td className="px-3 py-2">{fmtDate(first.data_inicio_rotativo_cartao)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Demais Ofertas */}
      {ofertas.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Demais Ofertas</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#00461e] text-white">
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Expiração</th>
                  <th className="px-2 py-2 text-left">Aprovação</th>
                  <th className="px-2 py-2 text-left">Negociação</th>
                  <th className="px-2 py-2 text-left">Proposta</th>
                  <th className="px-2 py-2 text-right">Rating</th>
                  <th className="px-2 py-2 text-right">Desembolso</th>
                  <th className="px-2 py-2 text-left">Data Desemb.</th>
                  <th className="px-2 py-2 text-left">Canal</th>
                </tr>
              </thead>
              <tbody>
                {ofertas.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1.5">{r.offer_status || '—'}</td>
                    <td className="px-2 py-1.5">{fmtDate(r.offer_expiration_date)}</td>
                    <td className="px-2 py-1.5">{r.approval_status || '—'}</td>
                    <td className="px-2 py-1.5">{r.negotiation_status || '—'}</td>
                    <td className="px-2 py-1.5">{r.proposal_status || '—'}</td>
                    <td className="px-2 py-1.5 text-right">{r.offer_rating ? parseFloat(r.offer_rating).toFixed(0) : '—'}</td>
                    <td className="px-2 py-1.5 text-right">{fmt(r.disbursement_value)}</td>
                    <td className="px-2 py-1.5">{fmtDate(r.disbursement_date)}</td>
                    <td className="px-2 py-1.5">{r.product_sales_channel || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Desembolso (contratos ativos) */}
      {ofertas.some(r => r.faixa_atraso_credito_ativo) && (
        <div>
          <h4 className="text-sm font-semibold text-gray-600 mb-2">Desembolso</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#00461e] text-white">
                  <th className="px-2 py-2 text-right">Desembolso</th>
                  <th className="px-2 py-2 text-left">Data</th>
                  <th className="px-2 py-2 text-right">Tx. Juros</th>
                  <th className="px-2 py-2 text-left">Vencimento</th>
                  <th className="px-2 py-2 text-right">Parcelas</th>
                  <th className="px-2 py-2 text-left">Faixa Atraso</th>
                  <th className="px-2 py-2 text-right">Rating Cont.</th>
                </tr>
              </thead>
              <tbody>
                {ofertas.filter(r => r.faixa_atraso_credito_ativo).map((r, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-2 py-1.5 text-right">{fmt(r.disbursement_value)}</td>
                    <td className="px-2 py-1.5">{fmtDate(r.disbursement_date)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtPct(r.tx_juros_mes__credito_ativo)}</td>
                    <td className="px-2 py-1.5">{fmtDate(r.data_vencimento_credito_ativo)}</td>
                    <td className="px-2 py-1.5 text-right">{r.qtd_parcelas_credito_ativo || '—'}</td>
                    <td className={`px-2 py-1.5 font-medium ${faixaColor(r.faixa_atraso_credito_ativo)}`}>
                      {r.faixa_atraso_credito_ativo || '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right">{r.rating_contabilidade_credito_ativo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
