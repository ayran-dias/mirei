import React, { useState, useMemo, useEffect } from 'react'
import AnimatedHero from '../components/AnimatedHero'
import { exportToXlsx } from '../utils/exportXlsx'

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

interface UserInfo {
  email: string
  isAdmin: boolean
  isSimuladorEditor: boolean
}

interface Inputs {
  valorDesembolsado: number
  prazoContrato: number
  taxaVendaAm: number
  cofAm: number
  keAm: number
  percKe: number
  canal: 'Automatica' | 'Especializada' | 'Complementar' | 'Digital'
  ctsUnit: number
  beta: number
  lambda: number
  pdInf: number
  lgd: number
}

interface MesCalc {
  t: number
  curvaOver30d: number
  pmtRatio: number
  pagamento: number
  juros: number
  amortizacao: number
  saldo: number
  saldoUnder90: number
  saldoLiqWO: number
  carteiraEmDia: number
  over30d: number
  over60d: number
  over90d: number
  wo: number
  receita: number
  imposto: number
  funding: number
  custoCap: number
  nii: number
  perdas: number
  riskAdjNii: number
  custosVar: number
  margemContrib: number
  cac: number
  mcNetSelling: number
  fluxoCaixa: number
}

interface Outputs {
  pmt: number
  wacc: number
  cacUnit: number
  pagamentoTotal: number
  saldoMedio: number
  saldoUnder90Medio: number
  carteiraLiqWOMedio: number
  pe12m: number
  peLifeTime: number
  pePercentual: number
  interestIncomeNet: number
  nii: number
  riskAdjNii: number
  netMargin: number
  nimAa: number
  riskAdjNimAa: number
  netYieldAa: number
  ltv: number
  npv: number
  tirAa: number
  meses: MesCalc[]
}

/* ------------------------------------------------------------------ */
/*  Tabela CAC por canal                                               */
/* ------------------------------------------------------------------ */

const CAC_TABLE: Record<string, number> = {
  Automatica: -137,
  Especializada: -55168.2,
  Complementar: -137,
  Digital: -137,
}

/* ------------------------------------------------------------------ */
/*  Motor de calculo                                                   */
/* ------------------------------------------------------------------ */

const TAX_RATE = 0.0465

function calcPMT(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper
  return (pv * rate) / (1 - Math.pow(1 + rate, -nper))
}

function calcNPV(rate: number, cashflows: number[]): number {
  let npv = 0
  for (let i = 0; i < cashflows.length; i++) {
    npv += cashflows[i] / Math.pow(1 + rate, i + 1)
  }
  return npv
}

function calcIRR(cashflows: number[], guess: number = 0.01): number {
  let rate = guess
  for (let iter = 0; iter < 1000; iter++) {
    let f = 0, df = 0
    for (let i = 0; i < cashflows.length; i++) {
      const denom = Math.pow(1 + rate, i)
      f += cashflows[i] / denom
      df -= i * cashflows[i] / Math.pow(1 + rate, i + 1)
    }
    if (Math.abs(df) < 1e-20) break
    const newRate = rate - f / df
    if (Math.abs(newRate - rate) < 1e-10) return newRate
    rate = newRate
  }
  return rate
}

function simulate(inputs: Inputs): Outputs {
  const {
    valorDesembolsado: VD,
    prazoContrato,
    taxaVendaAm: taxa,
    cofAm,
    keAm,
    percKe,
    canal,
    ctsUnit,
    beta,
    lambda,
    pdInf,
    lgd,
  } = inputs

  const pmt = calcPMT(taxa, prazoContrato, VD)
  const wacc = cofAm * (1 - percKe) + keAm * percKe
  const cacUnit = CAC_TABLE[canal] ?? -137

  const N = 64
  const meses: MesCalc[] = []

  const over30d: number[] = new Array(N).fill(0)
  const over60d: number[] = new Array(N).fill(0)
  const over90d: number[] = new Array(N).fill(0)
  const wo: number[] = new Array(N).fill(0)
  const saldo: number[] = new Array(N).fill(0)
  const saldoUnder90: number[] = new Array(N).fill(0)
  const saldoLiqWO: number[] = new Array(N).fill(0)
  const carteiraEmDia: number[] = new Array(N).fill(0)
  const curvaOver30d: number[] = new Array(N).fill(0)
  const pmtRatio: number[] = new Array(N).fill(0)
  const pagamento: number[] = new Array(N).fill(0)
  const juros: number[] = new Array(N).fill(0)
  const amortizacao: number[] = new Array(N).fill(0)

  const receita: number[] = new Array(N).fill(0)
  const imposto: number[] = new Array(N).fill(0)
  const funding: number[] = new Array(N).fill(0)
  const custoCap: number[] = new Array(N).fill(0)
  const niiArr: number[] = new Array(N).fill(0)
  const perdas: number[] = new Array(N).fill(0)
  const riskAdjNii: number[] = new Array(N).fill(0)
  const custosVar: number[] = new Array(N).fill(0)
  const margemContrib: number[] = new Array(N).fill(0)
  const cacArr: number[] = new Array(N).fill(0)
  const mcNetSelling: number[] = new Array(N).fill(0)
  const fluxoCaixa: number[] = new Array(N).fill(0)

  for (let t = 0; t < N; t++) {
    if (t === 0) {
      curvaOver30d[t] = pdInf * (1 - Math.exp(-Math.pow(0 / lambda, beta)))
    } else {
      curvaOver30d[t] = pdInf * (1 - Math.exp(-Math.pow(t / lambda, beta)))
    }

    if (t === 0) {
      pmtRatio[t] = 0.5
    } else {
      pmtRatio[t] = 1 * (1 - curvaOver30d[t])
    }

    if (t === 0) {
      const raw = pmtRatio[t] * pmt
      pagamento[t] = Math.max(Math.min(raw, VD), 0)
    } else {
      const raw = pmtRatio[t] * pmt
      pagamento[t] = Math.max(Math.min(raw, carteiraEmDia[t - 1]), 0)
    }

    if (t === 0) {
      juros[t] = VD * taxa * pmtRatio[t]
    } else {
      const prevU90 = saldoUnder90[t - 1]
      juros[t] = (prevU90 + Math.max(prevU90 * (1 + taxa) - pagamento[t], 0)) / 2 * taxa
    }

    amortizacao[t] = Math.max(pagamento[t] - juros[t], 0)

    if (t === 0) {
      over30d[t] = 0
    } else {
      over30d[t] = 0
    }

    if (t === 0) {
      saldo[t] = VD - amortizacao[t]
    } else {
      saldo[t] = saldo[t - 1] - pagamento[t] + juros[t]
    }

    if (t >= 1) {
      const newEntry = carteiraEmDia[t - 1] > 0
        ? VD * curvaOver30d[t]
        : over30d[t - 1]
      over30d[t] = Math.min(newEntry - pagamento[t] + juros[t] + amortizacao[t], saldo[t])
    }

    over60d[t] = t >= 2 ? over30d[t - 1] : 0
    over90d[t] = t >= 3 ? over30d[t - 2] : 0
    wo[t] = t >= 12 ? over30d[t - 11] : 0

    saldoUnder90[t] = Math.max(saldo[t] - over90d[t], 0)
    saldoLiqWO[t] = saldo[t] - wo[t]

    if (t === 0) {
      carteiraEmDia[t] = VD - amortizacao[t]
    } else {
      carteiraEmDia[t] = Math.max(saldo[t] - over30d[t], 0)
    }

    receita[t] = juros[t]
    imposto[t] = receita[t] * (-TAX_RATE)

    if (t === 0) {
      funding[t] = VD * cofAm * (-1) * (1 - percKe) * pmtRatio[t]
      custoCap[t] = VD * keAm * (-1) * percKe * pmtRatio[t]
    } else {
      const avgU90 = (saldoUnder90[t - 1] + saldoUnder90[t]) / 2
      funding[t] = avgU90 * cofAm * (-1) * (1 - percKe)
      custoCap[t] = avgU90 * keAm * (-1) * percKe
    }

    niiArr[t] = receita[t] + imposto[t] + funding[t] + custoCap[t]

    if (t === 0) {
      perdas[t] = 0
    } else {
      perdas[t] = (over90d[t] - (t >= 1 ? over90d[t - 1] : 0)) * (-1) * lgd
    }

    riskAdjNii[t] = niiArr[t] + perdas[t]

    if (saldoLiqWO[t] > VD * 0.01) {
      custosVar[t] = ctsUnit * saldoLiqWO[t] / saldo[t]
    } else {
      custosVar[t] = 0
    }

    margemContrib[t] = riskAdjNii[t] + custosVar[t]
    cacArr[t] = t === 0 ? cacUnit : 0
    mcNetSelling[t] = margemContrib[t] + cacArr[t]

    if (t === 0) {
      fluxoCaixa[t] = -VD + pagamento[t] + imposto[t] + funding[t] + custoCap[t] + custosVar[t]
    } else {
      fluxoCaixa[t] = pagamento[t] + imposto[t] + funding[t] + custoCap[t] + custosVar[t]
    }
  }

  for (let t = 0; t < N; t++) {
    meses.push({
      t,
      curvaOver30d: curvaOver30d[t],
      pmtRatio: pmtRatio[t],
      pagamento: pagamento[t],
      juros: juros[t],
      amortizacao: amortizacao[t],
      saldo: saldo[t],
      saldoUnder90: saldoUnder90[t],
      saldoLiqWO: saldoLiqWO[t],
      carteiraEmDia: carteiraEmDia[t],
      over30d: over30d[t],
      over60d: over60d[t],
      over90d: over90d[t],
      wo: wo[t],
      receita: receita[t],
      imposto: imposto[t],
      funding: funding[t],
      custoCap: custoCap[t],
      nii: niiArr[t],
      perdas: perdas[t],
      riskAdjNii: riskAdjNii[t],
      custosVar: custosVar[t],
      margemContrib: margemContrib[t],
      cac: cacArr[t],
      mcNetSelling: mcNetSelling[t],
      fluxoCaixa: fluxoCaixa[t],
    })
  }

  const statusContratoFlags = meses.map(m => m.saldoLiqWO > VD * 0.01 ? 1 : 0)
  const under90Flags = meses.map(m => m.saldoUnder90 > VD * 0.01 ? 1 : 0)
  const nMesesAtivos = statusContratoFlags.reduce((a, b) => a + b, 0) + 1

  const pagamentoTotal = pagamento.reduce((a, b) => a + b, 0)
  const saldoMedio = saldo.reduce((a, b) => a + b, 0) / N
  const sumU90 = saldoUnder90.reduce((a, b) => a + b, 0)
  const sumU90Flags = under90Flags.reduce((a, b) => a + b, 0)
  const saldoUnder90Medio = sumU90 / (sumU90Flags + 1)
  const sumLiqWO = meses.map(m => m.saldoLiqWO).reduce((a, b) => a + b, 0)
  const sumStatusFlags = statusContratoFlags.reduce((a, b) => a + b, 0)
  const carteiraLiqWOMedio = sumLiqWO / (sumStatusFlags + 1)

  const pe12m = meses.length > 12 ? over90d[12] : 0
  const peLifeTime = over90d[N - 1]
  const pePercentual = peLifeTime / VD

  const interestIncomeNet = receita.reduce((a, b) => a + b, 0) + imposto.reduce((a, b) => a + b, 0)
  const totalNii = niiArr.reduce((a, b) => a + b, 0)
  const totalRiskAdjNii = riskAdjNii.reduce((a, b) => a + b, 0)
  const totalNetMargin = margemContrib.reduce((a, b) => a + b, 0)

  const nimAa = Math.pow(1 + totalNii / saldoUnder90Medio, 12 / nMesesAtivos) - 1
  const riskAdjNimAa = Math.pow(1 + totalRiskAdjNii / saldoUnder90Medio, 12 / nMesesAtivos) - 1
  const netYieldAa = Math.pow(1 + totalNetMargin / saldoUnder90Medio, 12 / nMesesAtivos) - 1

  const ltv = calcNPV(wacc, margemContrib.slice(0))
  const npv = ltv + cacUnit

  const tirMensal = calcIRR(fluxoCaixa)
  const tirAa = Math.pow(1 + tirMensal, 12) - 1

  return {
    pmt,
    wacc,
    cacUnit,
    pagamentoTotal,
    saldoMedio,
    saldoUnder90Medio,
    carteiraLiqWOMedio,
    pe12m,
    peLifeTime,
    pePercentual,
    interestIncomeNet,
    nii: totalNii,
    riskAdjNii: totalRiskAdjNii,
    netMargin: totalNetMargin,
    nimAa,
    riskAdjNimAa,
    netYieldAa,
    ltv,
    npv,
    tirAa,
    meses,
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers de formatacao                                               */
/* ------------------------------------------------------------------ */

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(v: number, decimals: number = 2): string {
  return (v * 100).toFixed(decimals) + '%'
}

function fmtNum(v: number, decimals: number = 2): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/* ------------------------------------------------------------------ */
/*  Componentes auxiliares                                             */
/* ------------------------------------------------------------------ */

function InputField({ label, value, onChange, suffix, hint, step, readOnly }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; hint?: string; step?: number; readOnly?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#00461e] mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          step={step ?? 0.01}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          readOnly={readOnly}
          className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none ${
            readOnly
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
              : 'bg-white focus:ring-2 focus:ring-[#00d700]/40 focus:border-[#00d700]'
          }`}
        />
        {suffix && <span className="text-xs text-gray-400 whitespace-nowrap">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function parseBRL(str: string): number {
  const cleaned = str.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function CurrencyInputField({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string
}) {
  const formatBRL = (v: number) =>
    v > 0
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''

  const [display, setDisplay] = useState<string>(formatBRL(value))

  return (
    <div>
      <label className="block text-xs font-semibold text-[#00461e] mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          placeholder="R$ 0,00"
          onChange={e => {
            setDisplay(e.target.value)
            const parsed = parseBRL(e.target.value)
            onChange(parsed)
          }}
          onBlur={() => {
            setDisplay(formatBRL(value))
          }}
          onFocus={() => {
            setDisplay(value > 0 ? String(value) : '')
          }}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00d700]/40 focus:border-[#00d700] outline-none bg-white"
        />
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function PercentInputField({
  label, value, onChange, readOnly, decimals = 4, hint
}: {
  label: string
  value: number
  onChange: (v: number) => void
  readOnly?: boolean
  decimals?: number
  hint?: string
}) {
  const [display, setDisplay] = useState(() =>
    value > 0 ? (value * 100).toFixed(decimals) : ''
  )

  useEffect(() => {
    setDisplay(value > 0 ? (value * 100).toFixed(decimals) : '')
  }, [value, decimals])

  return (
    <div>
      <label className="block text-xs font-semibold text-[#00461e] mb-1">{label}</label>
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={display}
          readOnly={readOnly}
          onChange={e => {
            setDisplay(e.target.value)
            const n = parseFloat(e.target.value.replace(',', '.'))
            if (!isNaN(n)) onChange(n / 100)
          }}
          onBlur={() => {
            const n = parseFloat(display.replace(',', '.'))
            if (!isNaN(n)) {
              setDisplay((n).toFixed(decimals))
              onChange(n / 100)
            }
          }}
          onFocus={() => {
            const n = parseFloat(display)
            if (!isNaN(n)) setDisplay(String(n))
          }}
          className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pr-8 outline-none ${
            readOnly
              ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
              : 'bg-white focus:ring-2 focus:ring-[#00d700]/40 focus:border-[#00d700]'
          }`}
        />
        <span className="absolute right-3 text-gray-400 text-sm pointer-events-none">%</span>
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function MetricCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-extrabold ${positive === undefined ? 'text-[#00461e]' : positive ? 'text-emerald-600' : 'text-red-500'}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ReadOnlyMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-[#00461e]">{value}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

function SectionHeader({ title, restricted, isEditor }: { title: string; restricted?: boolean; isEditor?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h3 className="text-xs font-extrabold text-[#00461e] uppercase tracking-wider">{title}</h3>
      {restricted && !isEditor && (
        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
          Edicao restrita
        </span>
      )}
      {restricted && isEditor && (
        <span className="text-[10px] font-semibold text-[#1D9E75] bg-[#e6f7ee] border border-[#a3d9b3] px-1.5 py-0.5 rounded">
          Editor
        </span>
      )}
    </div>
  )
}

function CollapsibleRestrictedSection({ id, title, isEditor, expandedSections, setExpandedSections, children }: {
  id: string; title: string; isEditor: boolean; expandedSections: Set<string>; setExpandedSections: React.Dispatch<React.SetStateAction<Set<string>>>; children: React.ReactNode
}) {
  const isExpanded = expandedSections.has(id)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <button
        type="button"
        onClick={() => {
          if (!isEditor) return
          setExpandedSections(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
        }}
        className={`flex items-center justify-between w-full ${!isEditor ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 rounded-lg -m-1 p-1'}`}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-extrabold text-[#00461e] uppercase tracking-wider">{title}</h3>
          {!isEditor && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              Edicao restrita
            </span>
          )}
          {isEditor && (
            <span className="text-[10px] font-semibold text-[#1D9E75] bg-[#e6f7ee] border border-[#a3d9b3] px-1.5 py-0.5 rounded">
              Editor
            </span>
          )}
        </div>
        {isEditor && <span className="text-xs text-gray-400">{isExpanded ? '\u25B4' : '\u25BE'}</span>}
      </button>
      {!isEditor && !isExpanded && (
        <p className="text-[10px] text-gray-400 mt-2">Solicite acesso de editor para visualizar e alterar estes parametros.</p>
      )}
      {isExpanded && isEditor && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  )
}

function OutputSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-xs font-extrabold text-[#00461e] uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                               */
/* ------------------------------------------------------------------ */

const DEFAULTS: Inputs = {
  valorDesembolsado: 50000,
  prazoContrato: 12,
  taxaVendaAm: 0.0287,
  cofAm: 0.0123,
  keAm: 0.0153,
  percKe: 0.20,
  canal: 'Automatica',
  ctsUnit: -31,
  beta: 1.6,
  lambda: 3.78,
  pdInf: 0.06,
  lgd: 0.95,
}

interface SimuladorCreditoProps {
  onNavigate?: (page: string) => void
}

export default function SimuladorCredito({ onNavigate }: SimuladorCreditoProps) {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [userInfo, setUserInfo] = useState<UserInfo>({ email: '', isAdmin: false, isSimuladorEditor: false })

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).google?.script?.run) {
      const runner = (window as any).google.script.run
        .withSuccessHandler((info: UserInfo) => setUserInfo(info))
        .withFailureHandler(() => setUserInfo({ email: 'unknown', isAdmin: false, isSimuladorEditor: false }))
      runner.getUserInfo()
    } else {
      // Dev fallback
      setUserInfo({ email: 'dev@local', isAdmin: false, isSimuladorEditor: false })
    }
  }, [])

  const isEditor = userInfo.isSimuladorEditor

  /* Column picker for monthly table */
  type ColStyle = 'positive' | 'negative' | 'subtotal' | 'subtotal-final' | 'section-header' | undefined

  const COL_STYLE: Record<string, string> = {
    positive:         'text-emerald-700',
    negative:         'text-red-500',
    subtotal:         'font-bold text-blue-700 border-t border-blue-200',
    'subtotal-final': 'font-bold text-[#00461e] border-t-2 border-[#00461e] bg-[#f5fff5]',
    'section-header': 'font-bold text-gray-500 bg-gray-50 text-[10px] uppercase tracking-wider',
  }

  const TABLE_COLS: { key: keyof MesCalc; label: string; defaultOn: boolean; fmt: (v: number) => string; prefix?: string; style?: ColStyle }[] = [
    { key: 't',            label: 'Mes',          defaultOn: true,  fmt: v => String(v) },
    { key: 'saldo',        label: 'Saldo',         defaultOn: true,  fmt: fmtNum },
    { key: 'saldoUnder90', label: 'Under90',       defaultOn: true,  fmt: fmtNum },
    { key: 'carteiraEmDia',label: 'Cart.Dia',      defaultOn: true,  fmt: fmtNum },
    { key: 'over30d',      label: 'Over30d',       defaultOn: true,  fmt: fmtNum },
    { key: 'over60d',      label: 'Over60d',       defaultOn: true,  fmt: fmtNum },
    { key: 'over90d',      label: 'Over90d',       defaultOn: true,  fmt: fmtNum },
    { key: 'wo',           label: 'Write-off',     defaultOn: true,  fmt: fmtNum },
    { key: 'curvaOver30d', label: 'PD Curva',      defaultOn: true,  fmt: v => fmtPct(v, 3) },
    { key: 'pmtRatio',     label: 'PMT Ratio',     defaultOn: true,  fmt: v => fmtPct(v, 2) },
    { key: 'pagamento',    label: 'Pagamento',     defaultOn: true,  fmt: fmtNum },
    { key: 'juros',        label: 'Juros',         defaultOn: true,  fmt: fmtNum },
    { key: 'amortizacao',  label: 'Amort.',        defaultOn: true,  fmt: fmtNum },
    { key: 'receita',      label: 'Rec. Juros',    defaultOn: true,  fmt: fmtNum,  prefix: '(+)', style: 'positive' },
    { key: 'imposto',      label: 'Imposto',       defaultOn: true,  fmt: fmtNum,  prefix: '(-)', style: 'negative' },
    { key: 'funding',      label: 'Funding',       defaultOn: true,  fmt: fmtNum,  prefix: '(-)', style: 'negative' },
    { key: 'custoCap',     label: 'Custo Cap',     defaultOn: true,  fmt: fmtNum,  prefix: '(-)', style: 'negative' },
    { key: 'nii',          label: 'NII',           defaultOn: true,  fmt: fmtNum,  prefix: '(=)', style: 'subtotal' },
    { key: 'perdas',       label: 'Perdas (PDD)',  defaultOn: true,  fmt: fmtNum,               style: 'negative' },
    { key: 'riskAdjNii',   label: 'Risk-Adj NII',  defaultOn: true,  fmt: fmtNum,  prefix: '(=)', style: 'subtotal' },
    { key: 'custosVar',    label: 'Custos Var',    defaultOn: true,  fmt: fmtNum,               style: 'negative' },
    { key: 'margemContrib',label: 'Marg. Contrib', defaultOn: true,  fmt: fmtNum,  prefix: '(=)', style: 'subtotal' },
    { key: 'cac',          label: 'CAC',           defaultOn: true,  fmt: fmtNum,  prefix: '(-)', style: 'negative' },
    { key: 'mcNetSelling', label: 'MC Net Sell',   defaultOn: true,  fmt: fmtNum,  prefix: '(=)', style: 'subtotal-final' },
    { key: 'fluxoCaixa',   label: 'Fluxo Caixa',  defaultOn: true,  fmt: fmtNum,               style: 'section-header' },
  ]
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => new Set(TABLE_COLS.filter(c => c.defaultOn).map(c => c.key)))
  const [showColPicker, setShowColPicker] = useState(false)
  const activeCols = TABLE_COLS.filter(c => visibleCols.has(c.key))

  const set = <K extends keyof Inputs>(key: K) => (v: Inputs[K]) =>
    setInputs(prev => ({ ...prev, [key]: v }))

  const result = useMemo(() => simulate(inputs), [inputs])

  const maxShow = Math.min(inputs.prazoContrato + 6, 64)

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#f5fff5' }}>
      <AnimatedHero className="px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#a5fa00] text-[11px] font-bold uppercase tracking-[0.15em] mb-2">
            Ferramentas &middot; Simuladores &middot; Credito
          </p>
          <h1 className="text-white font-black text-3xl tracking-tight">Simulador K-Giro</h1>
          <p className="text-white/50 text-sm mt-2">
            Simulacao unitaria de emprestimo K-Giro: PnL, NPV, TIR e curva de inadimplencia Weibull.
          </p>
        </div>
      </AnimatedHero>

      {/* Link para documentação */}
      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 mb-6 mt-6">
        <div className="flex items-center gap-3 bg-[#00461e] rounded-2xl px-5 py-4">
          <svg className="w-5 h-5 text-[#c7ff3d] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-[#c7ff3d] text-xs font-bold uppercase tracking-wider">Documentação</p>
            <p className="text-white/80 text-sm">Metodologia e motor de cálculo</p>
          </div>
          <button
            onClick={() => onNavigate?.('doc-simulador-kgiro')}
            className="shrink-0 bg-[#c7ff3d] text-[#00461e] text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#d4ff5a] transition-colors"
          >
            Ver docs →
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-4 md:px-6 py-8">

        {/* ---- LAYOUT 2 COLUNAS: INPUTS | OUTPUTS ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ============ COLUNA INPUTS (esquerda) ============ */}
          <div className="space-y-5">
            <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider">Inputs</h2>

            {/* -- Secao: Contrato -- */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <SectionHeader title="Contrato" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CurrencyInputField
                  label="Valor Desembolsado"
                  value={inputs.valorDesembolsado}
                  onChange={set('valorDesembolsado')}
                />
                <InputField
                  label="Prazo Contrato"
                  value={inputs.prazoContrato}
                  onChange={v => set('prazoContrato')(Math.max(1, Math.round(v)))}
                  suffix="meses"
                  step={1}
                />
                <PercentInputField
                  label="Taxa de Juros a.m."
                  value={inputs.taxaVendaAm}
                  onChange={set('taxaVendaAm')}
                  decimals={4}
                />
                <div>
                  <label className="block text-xs font-semibold text-[#00461e] mb-1">Canal</label>
                  <select
                    value={inputs.canal}
                    onChange={e => set('canal')(e.target.value as Inputs['canal'])}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-[#00d700]/40 focus:border-[#00d700]"
                  >
                    <option value="Automatica">Automatica</option>
                    <option value="Especializada">Especializada</option>
                    <option value="Complementar">Complementar</option>
                    <option value="Digital">Digital</option>
                  </select>
                </div>
                <ReadOnlyMetric
                  label="PMT (calculado)"
                  value={fmtBRL(result.pmt)}
                  hint="Parcela mensal"
                />
              </div>
            </div>

            {/* -- Secao: Financing -- */}
            <CollapsibleRestrictedSection id="financing" title="Financing" isEditor={isEditor} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PercentInputField
                  label="CoF % a.m."
                  value={inputs.cofAm}
                  onChange={set('cofAm')}
                  decimals={4}
                  hint="Custo de funding mensal"
                />
                <PercentInputField
                  label="Pretax Ke % a.m."
                  value={inputs.keAm}
                  onChange={set('keAm')}
                  decimals={4}
                  hint="Custo de capital proprio"
                />
                <PercentInputField
                  label="% Capital Proprio"
                  value={inputs.percKe}
                  onChange={set('percKe')}
                  decimals={2}
                  hint="Fracao financiada com equity"
                />
                <ReadOnlyMetric
                  label="WACC (calculado)"
                  value={fmtPct(result.wacc)}
                  hint="Custo medio ponderado"
                />
              </div>
            </CollapsibleRestrictedSection>

            {/* -- Secao: Custos Operacionais -- */}
            <CollapsibleRestrictedSection id="custos-operacionais" title="Custos Operacionais" isEditor={isEditor} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="CTS Unitario"
                  value={inputs.ctsUnit}
                  onChange={set('ctsUnit')}
                  suffix="R$/mes"
                  hint="Custo de servir por contrato"
                />
                <ReadOnlyMetric
                  label="CAC Unitario (calculado)"
                  value={fmtBRL(result.cacUnit)}
                  hint={`Canal: ${inputs.canal}`}
                />
              </div>

              {/* Tabela CAC por canal */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">CAC / contrato por canal</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(CAC_TABLE).map(([canal, cac]) => (
                    <div key={canal} className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                      inputs.canal === canal ? 'bg-[#00461e]/5 border-[#00461e]/20 font-bold text-[#00461e]' : 'bg-gray-50 border-gray-100 text-gray-500'
                    }`}>
                      <span>{canal}</span>
                      <span className="ml-1.5">{fmtBRL(cac)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleRestrictedSection>

            {/* -- Secao: Curva Inadimplencia -- */}
            <CollapsibleRestrictedSection id="curva-inadimplencia" title="Curva Inadimplencia" isEditor={isEditor} expandedSections={expandedSections} setExpandedSections={setExpandedSections}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Beta (Weibull)"
                  value={inputs.beta}
                  onChange={set('beta')}
                  hint="Forma da curva de inadimplencia"
                />
                <InputField
                  label="Lambda"
                  value={inputs.lambda}
                  onChange={set('lambda')}
                  hint="Escala da curva Weibull"
                />
                <PercentInputField
                  label="PD Infinito"
                  value={inputs.pdInf}
                  onChange={set('pdInf')}
                  decimals={2}
                  hint="Probabilidade default terminal"
                />
                <PercentInputField
                  label="LGD"
                  value={inputs.lgd}
                  onChange={set('lgd')}
                  decimals={2}
                  hint="Loss Given Default"
                />
              </div>
            </CollapsibleRestrictedSection>
          </div>

          {/* ============ COLUNA OUTPUTS (direita) ============ */}
          <div className="space-y-5">
            <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider">Outputs</h2>

            {/* -- Saldos -- */}
            <OutputSection title="Saldos">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Pagamento Total" value={fmtBRL(result.pagamentoTotal)} />
                <MetricCard label="Saldo Medio" value={fmtBRL(result.saldoMedio)} />
                <MetricCard label="Saldo Under90 Medio" value={fmtBRL(result.saldoUnder90Medio)} />
                <MetricCard label="Cart. Liq WO Media" value={fmtBRL(result.carteiraLiqWOMedio)} />
              </div>
            </OutputSection>

            {/* -- Inadimplencia -- */}
            <OutputSection title="Inadimplencia">
              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="PE 12m" value={fmtBRL(result.pe12m)} sub="Over90d no mes 12" />
                <MetricCard label="PE Life Time" value={fmtBRL(result.peLifeTime)} />
                <MetricCard label="PE / Desembolso" value={fmtPct(result.pePercentual, 2)} />
              </div>
            </OutputSection>

            {/* -- Rentabilidade -- */}
            <OutputSection title="Rentabilidade">
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Interest Income, net" value={fmtBRL(result.interestIncomeNet)} positive={result.interestIncomeNet > 0} />
                <MetricCard label="NII" value={fmtBRL(result.nii)} positive={result.nii > 0} />
                <MetricCard label="Risk-Adj NII" value={fmtBRL(result.riskAdjNii)} positive={result.riskAdjNii > 0} />
                <MetricCard label="Net Margin" value={fmtBRL(result.netMargin)} positive={result.netMargin > 0} />
              </div>
            </OutputSection>

            {/* -- Yields Anualizados -- */}
            <OutputSection title="Yields Anualizados">
              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="NIM a.a." value={fmtPct(result.nimAa)} positive={result.nimAa > 0} />
                <MetricCard label="Risk-Adj NIM a.a." value={fmtPct(result.riskAdjNimAa)} positive={result.riskAdjNimAa > 0} />
                <MetricCard label="Net Yield a.a." value={fmtPct(result.netYieldAa)} positive={result.netYieldAa > 0} />
              </div>
            </OutputSection>

            {/* -- NPV/TIR -- */}
            <OutputSection title="NPV / TIR">
              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="LTV" value={fmtBRL(result.ltv)} positive={result.ltv > 0} />
                <MetricCard label="NPV" value={fmtBRL(result.npv)} positive={result.npv > 0} />
                <MetricCard label="TIR a.a." value={isFinite(result.tirAa) ? fmtPct(result.tirAa) : 'N/A'} positive={result.tirAa > 0} sub="IRR anualizada" />
              </div>
            </OutputSection>
          </div>
        </div>

        {/* ---- TABELA MENSAL ---- */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold text-[#00461e] uppercase tracking-wider">Fluxo Mensal Detalhado</h2>
            <div className="flex items-center gap-2">
              {/* Column picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColPicker(p => !p)}
                  className="text-xs font-bold text-[#00461e]/60 hover:text-[#00461e] transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5"
                >
                  Colunas {'\u25BE'}
                </button>
                {showColPicker && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-3 w-56 max-h-80 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Colunas visiveis</p>
                    {TABLE_COLS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 py-0.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleCols.has(col.key)}
                          onChange={() => setVisibleCols(prev => {
                            const next = new Set(prev)
                            if (next.has(col.key)) next.delete(col.key)
                            else next.add(col.key)
                            return next
                          })}
                          className="rounded border-gray-300 text-[#00461e] focus:ring-[#00461e]"
                        />
                        <span className="text-xs text-gray-600">{col.label}</span>
                      </label>
                    ))}
                    <div className="border-t border-gray-100 mt-2 pt-2 flex gap-2">
                      <button onClick={() => setVisibleCols(new Set(TABLE_COLS.map(c => c.key)))} className="text-[10px] text-[#00461e] font-bold hover:underline">Todas</button>
                      <button onClick={() => setVisibleCols(new Set(TABLE_COLS.filter(c => c.defaultOn).map(c => c.key)))} className="text-[10px] text-gray-500 font-bold hover:underline">Padrao</button>
                    </div>
                  </div>
                )}
              </div>
              {/* Excel export */}
              <button
                onClick={() => {
                  const rows = result.meses.slice(0, maxShow)
                  const headers = activeCols.map(c => ({ key: c.key, label: c.label }))
                  exportToXlsx(rows as unknown as Record<string, any>[], headers, 'simulador_kgiro_fluxo')
                }}
                className="text-xs font-bold text-[#00461e]/60 hover:text-[#00461e] transition-colors border border-gray-200 rounded-lg px-2.5 py-1.5"
              >
                Excel
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="min-w-[900px] w-full text-xs">
              <thead className="bg-[#00461e] text-white">
                <tr>
                  {activeCols.map(col => (
                    <th key={col.key} className={`px-3 py-2 font-bold ${col.key === 't' ? 'text-left' : 'text-right'}`}>
                      {col.prefix && <span className="opacity-60 mr-1">{col.prefix}</span>}
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.meses.slice(0, maxShow).map(m => (
                  <tr key={m.t} className={m.t % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    {activeCols.map(col => {
                      const v = m[col.key] as number
                      if (col.key === 't') return <td key={col.key} className="px-3 py-1.5 font-bold text-[#00461e]">{v}</td>
                      const styleClass = col.style ? (COL_STYLE[col.style] ?? '') : ''
                      const displayVal = col.key === 'perdas' ? (v !== 0 ? col.fmt(v) : '-') : col.fmt(v)
                      return (
                        <td key={col.key} className={`px-3 py-1.5 text-right ${styleClass}`}>
                          {displayVal}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-[11px] text-gray-400 pb-6 mt-8">
          Mesa Banco - Pricing Operacoes
        </div>
      </div>
    </div>
  )
}
