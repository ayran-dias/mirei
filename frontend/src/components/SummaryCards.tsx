import type React from 'react'
import type { NpvCredito, PnlAdquirenciaRow, StatusCreditoRow, BancoMedia } from '../types'
import { CardSkeleton } from './Skeleton'
import InfoTooltip from './InfoTooltip'
const F360_NAV = [{ label: 'Documentação →', page: 'doc-felicia360' }]

const fmt = (v: number, decimals = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const fmtPct = (v: number) => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'

const colorClass = (v: number) => v >= 0 ? 'text-emerald-600' : 'text-red-600'

// Trend arrow: compares current (M-1) vs baseline avg (M-2..M-4)
// newLabel: shown when client doesn't have enough history (M0, M1, M2, M3)
function TrendArrow({ current, baseline, isRate = false, newLabel }: {
  current: number | null
  baseline: number | null
  isRate?: boolean
  newLabel?: string
}) {
  if (newLabel) return <span className="text-[10px] font-bold text-gray-400 ml-1">{newLabel}</span>
  if (current === null || baseline === null) return null
  const absBaseline = Math.abs(baseline)
  if (absBaseline === 0) return null
  const threshold = isRate ? 0.001 : absBaseline * 0.10  // 0.1pp for rates, 10% for BRL
  const diff = current - baseline
  if (Math.abs(diff) <= threshold) return <span className="text-gray-400 text-xs font-black ml-1">=</span>
  if (diff > 0) return <span className="text-emerald-500 text-xs font-black ml-1">↑</span>
  return <span className="text-red-500 text-xs font-black ml-1">↓</span>
}

function MetricRow({ label, value, format = 'brl', trend }: {
  label: string; value: number | null; format?: 'brl' | 'pct'; trend?: React.ReactNode
}) {
  if (value === null || isNaN(value)) return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className="text-gray-300 text-sm">—</span>
    </div>
  )
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-gray-500 text-xs">{label}</span>
      <div className="flex items-center">
        <span className={`font-semibold text-sm ${colorClass(value)}`}>
          {format === 'pct' ? fmtPct(value) : `R$ ${fmt(value)}`}
        </span>
        {trend}
      </div>
    </div>
  )
}

interface Props {
  npv: NpvCredito[] | null
  npvStatus: string
  pnl: PnlAdquirenciaRow[] | null
  pnlStatus: string
  credito: StatusCreditoRow[] | null
  banco: BancoMedia[] | null
  bancoStatus: string
}

export default function SummaryCards({ npv, npvStatus, pnl, pnlStatus, credito, banco, bancoStatus }: Props) {
  // Credito
  const creditData = npv && npv.length > 0 ? npv[0] : null
  const nii = creditData ? parseFloat(creditData.nii) : null
  const riskAdj = creditData ? parseFloat(creditData.risk_adj_nii) : null
  const npvVal = creditData ? parseFloat(creditData.npv) : null

  // Adquirencia — media ultimos 3 meses com TPV > 0 + tendência vs média M-2..M-4
  let avgTpv: number | null = null
  let avgMargemTpv: number | null = null
  let avgNetMdr: number | null = null
  let avgMargem: number | null = null
  let avgTkr: number | null = null

  // Tendência: M-1 vs avg(M-2, M-3, M-4)
  let trendTpv: { current: number | null; baseline: number | null; newLabel?: string } = { current: null, baseline: null }
  let trendMargem: typeof trendTpv = { current: null, baseline: null }
  let trendMargemTpv: typeof trendTpv = { current: null, baseline: null }
  let trendNetMdr: typeof trendTpv = { current: null, baseline: null }
  let trendTkr: typeof trendTpv = { current: null, baseline: null }

  if (pnl && pnl.length > 0) {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    // Pegar até 4 meses fechados com TPV > 0 (precisamos de 4 para calcular tendência)
    const closed4 = pnl
      .filter(r => parseFloat(r.tpv) > 0 && r.mes !== currentMonth)
      .sort((a, b) => b.mes.localeCompare(a.mes))
      .slice(0, 4)

    const closed = closed4.slice(0, 3) // 3 meses para a média exibida

    if (closed.length > 0) {
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
      avgTpv = avg(closed.map(r => parseFloat(r.tpv)))
      avgMargem = avg(closed.map(r => parseFloat(r.margem)))
      avgMargemTpv = avg(closed.filter(r => r.margem_div_tpv).map(r => parseFloat(r.margem_div_tpv!)))
      avgNetMdr = avg(closed.filter(r => r.pctg_net_mdr).map(r => parseFloat(r.pctg_net_mdr!)))
      avgTkr = avg(closed.filter(r => r.tkr_net_cof).map(r => parseFloat(r.tkr_net_cof!)))
    }

    // Tendência: cliente novo → badge Mn; histórico suficiente → seta
    const monthCount = closed4.length
    if (monthCount < 4) {
      const lbl = `M${monthCount}`
      trendTpv = trendMargem = trendMargemTpv = trendNetMdr = trendTkr = { current: null, baseline: null, newLabel: lbl }
    } else {
      const avgN = (arr: (number | null)[]) => {
        const vals = arr.filter((v): v is number => v !== null)
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      }
      const baseline3 = closed4.slice(1, 4) // M-2, M-3, M-4
      const m1 = closed4[0]
      trendTpv = {
        current: parseFloat(m1.tpv),
        baseline: avgN(baseline3.map(r => parseFloat(r.tpv))),
      }
      trendMargem = {
        current: parseFloat(m1.margem),
        baseline: avgN(baseline3.map(r => parseFloat(r.margem))),
      }
      trendMargemTpv = {
        current: m1.margem_div_tpv ? parseFloat(m1.margem_div_tpv) : null,
        baseline: avgN(baseline3.map(r => r.margem_div_tpv ? parseFloat(r.margem_div_tpv) : null)),
      }
      trendNetMdr = {
        current: m1.pctg_net_mdr ? parseFloat(m1.pctg_net_mdr) : null,
        baseline: avgN(baseline3.map(r => r.pctg_net_mdr ? parseFloat(r.pctg_net_mdr) : null)),
      }
      trendTkr = {
        current: m1.tkr_net_cof ? parseFloat(m1.tkr_net_cof) : null,
        baseline: avgN(baseline3.map(r => r.tkr_net_cof ? parseFloat(r.tkr_net_cof) : null)),
      }
    }
  }

  // Seguros — lógica cross-card: Prestamista vai para Crédito, demais ficam em Banco
  const bancoRaw = banco && banco.length > 0 ? banco[0] : null
  const segurosReceita = bancoRaw?.receita_seguros ? parseFloat(bancoRaw.receita_seguros) : null
  const segurosProdutos = bancoRaw?.produtos_seguro || null
  const temPrestamista = segurosProdutos?.toLowerCase().includes('prestamista') ?? false

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Card Credito */}
      {npvStatus === 'loading' ? <CardSkeleton /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#c8d2c8] overflow-hidden">
          <div className="bg-[#00d700] px-4 py-2 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Crédito: Lifetime (VP)</h3>
            <InfoTooltip lines={[
              'NII: Receita de Juros - Custo de Funding → todo fluxo a valor presente',
              'Risk Adj NII: NII - Custo de Risco → fluxo a VP',
              'NPV: Risk Adj NII - Custo Operacional - CAC',
            ]} navLinks={F360_NAV} />
          </div>
          <div className="p-3">
          {npvStatus === 'error' || !creditData ? (
            <p className="text-gray-400 text-sm">Sem dados de crédito</p>
          ) : (() => {
            // Resumo de desembolso a partir dos dados de status crédito
            const desembolsos = credito
              ? Array.from(new Map(credito.filter(r => r.faixa_atraso_credito_ativo && r.offer_id).map(r => [r.offer_id, r])).values())
              : []
            const qtd = desembolsos.length
            const total = desembolsos.reduce((s, r) => s + (parseFloat(r.disbursement_value || '0') || 0), 0)
            const emDia = desembolsos.filter(r => r.faixa_atraso_credito_ativo === 'Em dia').length
            const encerrados = desembolsos.filter(r => r.faixa_atraso_credito_ativo === 'Encerrado').length
            const atrasos = desembolsos.filter(r => r.faixa_atraso_credito_ativo && r.faixa_atraso_credito_ativo !== 'Em dia' && r.faixa_atraso_credito_ativo !== 'Encerrado')
            const parts: string[] = []
            if (emDia > 0) parts.push(`${emDia} em dia`)
            if (encerrados > 0) parts.push(`${encerrados} finalizado${encerrados > 1 ? 's' : ''}`)
            let adimplencia = parts.join(', ') || 'Sem contratos'
            if (atrasos.length > 0) {
              const resumos = atrasos.map(r => r.faixa_atraso_credito_ativo)
              adimplencia = `${atrasos.length} atraso${atrasos.length > 1 ? 's' : ''} (${resumos.join(', ')})` + (parts.length > 0 ? ` · ${parts.join(', ')}` : '')
            }
            const adimColor = atrasos.length === 0 ? 'text-emerald-600' : 'text-red-600'

            return (
            <div>
              <div className="space-y-0.5">
                <MetricRow label="NII" value={nii} />
                <MetricRow label="Risk Adj NII" value={riskAdj} />
                <MetricRow label="NPV" value={npvVal} />
              </div>
              {qtd > 0 && (
                <div className="mt-1 pt-1 border-t border-[#e8f0e8] space-y-0">
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-500 text-xs">Desembolsos</span>
                    <span className="font-semibold text-sm text-gray-800">{qtd}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-500 text-xs">Total desembolsado</span>
                    <span className="font-semibold text-sm text-gray-800">R$ {fmt(total)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-gray-500 text-xs">Adimplência</span>
                    <span className={`font-semibold text-xs ${adimColor}`}>{adimplencia}</span>
                  </div>
                </div>
              )}
              {temPrestamista && (segurosReceita !== null || segurosProdutos) && (
                <div className="mt-1 pt-1 border-t border-[#e8f0e8] space-y-0">
                  <MetricRow label="Receita Seguros" value={segurosReceita} />
                  {segurosProdutos && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-500 text-xs">Produtos</span>
                      <span className="font-semibold text-xs text-amber-700 text-right">{segurosProdutos}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            )
          })()}
          </div>
        </div>
      )}

      {/* Card Adquirência */}
      {pnlStatus === 'loading' ? <CardSkeleton /> : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#c8d2c8] overflow-hidden">
          <div className="bg-[#00461e] px-4 py-2 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Adquirência: Média 3m</h3>
            <InfoTooltip lines={[
              'TPV: Volume Total de Pagamentos',
              'Margem: Receita nCOF - COGs',
              'Net MDR %: [MDR - (IC + Fee)] / cTPV',
              'TKR nCOF: Receita nCOF / TPV',
            ]} navLinks={F360_NAV} />
          </div>
          <div className="p-3">
          {pnlStatus === 'error' || avgTpv === null ? (
            <p className="text-gray-400 text-sm">Sem dados de adquirência</p>
          ) : (
            <div className="space-y-0.5">
              <MetricRow label="TPV" value={avgTpv} trend={<TrendArrow {...trendTpv} />} />
              <MetricRow label="Margem (R$)" value={avgMargem} trend={<TrendArrow {...trendMargem} />} />
              <MetricRow label="Margem/TPV" value={avgMargemTpv} format="pct" trend={<TrendArrow {...trendMargemTpv} isRate />} />
              <MetricRow label="Net MDR %" value={avgNetMdr} format="pct" trend={<TrendArrow {...trendNetMdr} isRate />} />
              <MetricRow label="TKR nCOF" value={avgTkr} format="pct" trend={<TrendArrow {...trendTkr} isRate />} />
              {avgTpv !== null && avgTkr !== null && avgTpv < 1000 && avgTkr > 0.05 && (
                <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                  Métricas distorcidas pelo baixo TPV
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Card Banco */}
      {bancoStatus === 'loading' ? <CardSkeleton /> : (() => {
        const bancoData = banco && banco.length > 0 ? banco[0] : null
        const saldoConta = bancoData?.saldo_conta ? parseFloat(bancoData.saldo_conta) : null
        const saldoReservas = bancoData?.saldo_reservas ? parseFloat(bancoData.saldo_reservas) : null
        const boletoEmitido = bancoData?.boleto_emitido ? parseFloat(bancoData.boleto_emitido) : null
        const boletoLiquidado = bancoData?.boleto_liquidado ? parseFloat(bancoData.boleto_liquidado) : null
        const volumeBoleto = bancoData?.volume_boleto ? parseFloat(bancoData.volume_boleto) : null
        const receitaSeguros = bancoData?.receita_seguros ? parseFloat(bancoData.receita_seguros) : null
        const produtosSeguros = bancoData?.produtos_seguro || null

        // Resumo cartão para o card Banco
        const cartaoRow = credito ? credito.find(r => r.documento_dono) : null
        const temCartao = !!cartaoRow?.documento_dono
        const limDisp = cartaoRow?.limite_disponivel ? parseFloat(cartaoRow.limite_disponivel) : null
        const limConc = cartaoRow?.limite_concedido ? parseFloat(cartaoRow.limite_concedido) : null
        const temRotativo = !!cartaoRow?.data_inicio_rotativo_cartao
        const limiteNegativo = limDisp !== null && limDisp < 0
        const semLimite = temCartao && (limConc === null || limConc === 0)

        let cartaoResumo: string | null = null
        let cartaoResumoColor = 'text-gray-500'
        if (temCartao) {
          if (limiteNegativo) {
            cartaoResumo = 'Possui cartão, limite negativo (provavelmente rotativo)'
            cartaoResumoColor = 'text-red-600'
          } else if (temRotativo) {
            cartaoResumo = 'Possui e usa cartão de crédito (rotativo ativo)'
            cartaoResumoColor = 'text-amber-600'
          } else if (semLimite) {
            cartaoResumo = 'Possui cartão, sem limite de crédito'
            cartaoResumoColor = 'text-amber-600'
          } else {
            cartaoResumo = 'Possui cartão de crédito'
            cartaoResumoColor = 'text-emerald-600'
          }
        }

        return (
        <div className="bg-white rounded-2xl shadow-sm border border-[#c8d2c8] overflow-hidden">
          <div className="bg-[#00d700] px-4 py-2 flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Banco: Média 3m</h3>
            <InfoTooltip lines={[
              'Saldo Conta: Média do saldo em conta (visão cliente) nos últimos 3 meses',
              'Saldo Reservas: Média do saldo em reservas nos últimos 3 meses',
              'Boletos Emitidos: Média mensal de boletos emitidos',
              'Boletos Liquidados: Média mensal de boletos liquidados',
              'Volume Boleto: Valor médio mensal de boletos liquidados (R$)',
              'Receita Seguros: Média mensal de receita com seguros',
              'Produtos: Seguros contratados pelo cliente',
            ]} navLinks={F360_NAV} />
          </div>
          <div className="p-3">
          {bancoStatus === 'error' || !bancoData ? (
            <p className="text-gray-400 text-sm">Sem dados bancários</p>
          ) : (
            <div className="space-y-0.5">
              <MetricRow label="Saldo Conta" value={saldoConta} />
              <MetricRow label="Saldo Reservas" value={saldoReservas} />
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500 text-xs">Boletos Emitidos</span>
                <span className="font-semibold text-sm text-gray-800">{boletoEmitido !== null ? boletoEmitido.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500 text-xs">Boletos Liquidados</span>
                <span className="font-semibold text-sm text-gray-800">{boletoLiquidado !== null ? boletoLiquidado.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}</span>
              </div>
              <MetricRow label="Volume Boleto" value={volumeBoleto} />
              {!temPrestamista && (receitaSeguros !== null || produtosSeguros) && (
                <div className="mt-1 pt-1 border-t border-[#e8f0e8] space-y-0">
                  <MetricRow label="Receita Seguros" value={receitaSeguros} />
                  {produtosSeguros && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-gray-500 text-xs">Produtos</span>
                      <span className="font-semibold text-sm text-gray-800 text-right">{produtosSeguros}</span>
                    </div>
                  )}
                </div>
              )}
              {cartaoResumo && (
                <div className="mt-1 pt-1 border-t border-[#e8f0e8]">
                  {/* Limites centralizados */}
                  {temCartao && (limConc !== null || limDisp !== null) && (
                    <div className="flex justify-center gap-2 mb-0.5">
                      {limConc !== null && (
                        <div className="text-center">
                          <span className="text-[10px] text-[#96a096] block">Limite Concedido (Cartão)</span>
                          <span className="text-sm font-semibold text-[#1e281e]">
                            {limConc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {limDisp !== null && (
                        <div className="text-center">
                          <span className="text-[10px] text-[#96a096] block">Limite Disponível (Cartão)</span>
                          <span className={`text-sm font-semibold ${limDisp < 0 ? 'text-[#d70000]' : 'text-[#1e281e]'}`}>
                            {limDisp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Texto resumo como info complementar */}
                  <p className={`text-[10px] text-center ${cartaoResumoColor} opacity-80`}>{cartaoResumo}</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
        )
      })()}
    </div>
  )
}
