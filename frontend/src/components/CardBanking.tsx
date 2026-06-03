import { useState, useEffect, useRef } from 'react'
import type { BancoHistoricoRow } from '../types'
import { TableSkeleton } from './Skeleton'
import CollapsibleCard from './CollapsibleCard'

// ── Formatadores pt-BR ────────────────────────────────────────────────────────

const fmtBRL = (v: string | null) => {
  if (!v || v === 'null') return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const fmtQty = (v: string | null) => {
  if (!v || v === 'null') return '—'
  const n = parseInt(v, 10)
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR')
}

const negColor = (v: string | null) => {
  if (!v || v === 'null') return ''
  const n = parseFloat(v)
  return !isNaN(n) && n < 0 ? 'text-red-600' : ''
}

// ── Definição das colunas por seção ──────────────────────────────────────────

type ColFormat = 'brl' | 'qty'

interface ColDef {
  key: string
  label: string
  format: ColFormat
}

interface SectionDef {
  title: string
  cols: ColDef[]
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Saldos Médios (R$)',
    cols: [
      { key: 'media_saldo_conta_visao_cliente', label: 'Saldo Conta', format: 'brl' },
      { key: 'media_saldo_reservas',           label: 'Reservas',    format: 'brl' },
    ],
  },
  {
    title: 'Receitas (R$)',
    cols: [
      { key: 'receita_floating_sweep',         label: 'Sweep',       format: 'brl' },
      { key: 'receita_pix_pos',                label: 'PIX POS',     format: 'brl' },
      { key: 'receita_floating_conta_reserva', label: 'Float C+R',   format: 'brl' },
      { key: 'receita_interchange_cartao',     label: 'Interchange', format: 'brl' },
      { key: 'receita_cartao',                 label: 'Cartão',      format: 'brl' },
      { key: 'receita_boleto',                 label: 'Boleto',      format: 'brl' },
      { key: 'receita_juros_rotativo',         label: 'Rot.',        format: 'brl' },
      { key: 'receita_movimentacao',           label: 'Movim.',      format: 'brl' },
      { key: 'receita_outros_cartao',          label: 'Out. Cartão', format: 'brl' },
      { key: 'receita_floating_delayed',       label: 'Delay',       format: 'brl' },
      { key: 'receita_outros_banking',         label: 'Outros',      format: 'brl' },
    ],
  },
  {
    title: 'Boletos (Volume)',
    cols: [
      { key: 'qtd_boleto_emitido',   label: 'Emitido',    format: 'qty' },
      { key: 'qtd_boleto_liquidado', label: 'Liquidado',  format: 'qty' },
      { key: 'vlr_boleto_liquidado', label: 'Valor Liq.', format: 'brl' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCellDisplay(row: BancoHistoricoRow, col: ColDef): { display: string; color: string } {
  const rawVal = (row as Record<string, string | null>)[col.key] ?? null
  if (col.format === 'qty') return { display: fmtQty(rawVal), color: '' }
  return { display: fmtBRL(rawVal), color: negColor(rawVal) }
}

// ── Filtro de meses (dropdown) ────────────────────────────────────────────────

const DEFAULT_MONTHS = 7

function MonthDropdown({
  months,
  selectedMonths,
  setSelectedMonths,
}: {
  months: string[]
  selectedMonths: Set<string>
  setSelectedMonths: (s: Set<string>) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (m: string) => {
    const next = new Set(selectedMonths)
    if (next.has(m)) {
      if (next.size === 1) return
      next.delete(m)
    } else {
      next.add(m)
    }
    setSelectedMonths(next)
  }

  const fmtLabel = (m: string) => {
    const [y, mo] = m.split('-')
    return `${mo}/${y?.slice(2)}`
  }

  return (
    <div className="relative flex items-center gap-2 px-1 py-2 border-b border-indigo-100" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs px-3 py-1.5 border border-indigo-200 rounded-full hover:bg-indigo-50 transition-colors flex items-center gap-1.5 text-indigo-700"
      >
        {selectedMonths.size} {selectedMonths.size === 1 ? 'mês' : 'meses'} ▾
      </button>

      {selectedMonths.size < months.length && (
        <span className="text-[10px] text-indigo-600 font-medium">
          de {months.length} disponíveis
        </span>
      )}

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg p-3 w-52 max-h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-600">Filtrar meses</span>
            <button
              onClick={() => setSelectedMonths(new Set(months))}
              className="text-[10px] text-indigo-600 hover:underline"
            >
              Todos
            </button>
          </div>
          {months.map(m => (
            <label key={m} className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-indigo-50 px-1 rounded">
              <input
                type="checkbox"
                checked={selectedMonths.has(m)}
                onChange={() => toggle(m)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-700">{fmtLabel(m)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  data: BancoHistoricoRow[] | null
  status: string
  selectedCompanies?: string[]
  defaultOpen?: boolean
}

export default function CardBanking({ data, status, selectedCompanies, defaultOpen = false }: Props) {
  const [selectedMonths, setSelectedMonths] = useState<Set<string> | null>(null)
  const allSectionTitles = SECTIONS.map(s => s.title)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(allSectionTitles))

  const toggleSection = (title: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  const allMonths: string[] = data ? data.map(r => r.mes) : []

  useEffect(() => {
    if (allMonths.length > 0 && selectedMonths === null) {
      const defaultSelection = allMonths.slice(0, DEFAULT_MONTHS)
      setSelectedMonths(new Set(defaultSelection))
    }
  }, [allMonths.join(',')])

  if (status === 'loading') return (
    <CollapsibleCard title="Banking: Detalhado Mensal" defaultOpen={defaultOpen}>
      <TableSkeleton rows={8} />
    </CollapsibleCard>
  )

  if (status === 'error' || !data || data.length === 0) return (
    <CollapsibleCard title="Banking: Detalhado Mensal" defaultOpen={defaultOpen}>
      <p className="text-gray-400 text-sm">Sem dados de banking</p>
    </CollapsibleCard>
  )

  const activeMonths = selectedMonths ?? new Set(allMonths)
  // filteredData mantém apenas os meses selecionados, preservando a ordem original (desc)
  const filteredData = data.filter(r => activeMonths.has(r.mes))

  // Colunas visíveis = todas as colunas das seções abertas
  // Para o header de grupo, precisamos saber o span de cada seção aberta
  const visibleSections = SECTIONS.map(s => ({
    ...s,
    isOpen: openSections.has(s.title),
    visibleCols: openSections.has(s.title) ? s.cols : [],
  }))

  // Formatar mês "YYYY-MM" → "MM/YYYY"
  const fmtMonth = (m: string) => {
    if (!m) return '—'
    const parts = m.split('-')
    if (parts.length === 2 && parts[0].length === 4) {
      return `${parts[1]}/${parts[0]}`
    }
    return m
  }

  const allCompanies = !selectedCompanies || selectedCompanies.length === 2
  const badgeLabel = allCompanies
    ? 'Stone + Pagar.me'
    : selectedCompanies!.join(' + ')
  const badgeTitle = allCompanies
    ? 'Receitas de banking consolidadas (Stone + Pagar.me). Saldos e boletos são por conta (sempre consolidados).'
    : `Receitas de banking filtradas por ${badgeLabel}. Saldos e boletos são por conta (sempre consolidados).`
  const bankingBadge = (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium border border-gray-200"
      title={badgeTitle}
    >
      {badgeLabel}
    </span>
  )

  return (
    <CollapsibleCard title="Banking: Detalhado Mensal" defaultOpen={defaultOpen} headerRight={bankingBadge}>
      <MonthDropdown
        months={allMonths}
        selectedMonths={activeMonths}
        setSelectedMonths={setSelectedMonths}
      />

      <div className="overflow-x-auto rounded-lg">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="sticky top-0 z-10">
            {/* Linha 1: seções (grupos de colunas) */}
            <tr className="bg-indigo-50 border-b border-indigo-100">
              {/* célula "Mês" ocupa as duas linhas de header */}
              <th
                rowSpan={2}
                className="px-3 py-2 text-left text-indigo-700 font-semibold sticky left-0 bg-indigo-50 z-20 min-w-[72px] align-middle"
              >
                Mês
              </th>

              {visibleSections.map(section => (
                <th
                  key={section.title}
                  colSpan={section.isOpen ? section.cols.length : 1}
                  className="px-2 py-1.5 text-center text-indigo-600 font-bold text-[10px] uppercase tracking-wide border-l border-indigo-200 cursor-pointer select-none hover:bg-indigo-100/60 transition-colors"
                  onClick={() => toggleSection(section.title)}
                >
                  <span className="mr-1">{section.isOpen ? '▾' : '▴'}</span>
                  {section.title}
                </th>
              ))}
            </tr>

            {/* Linha 2: labels de colunas */}
            <tr className="bg-indigo-50 border-b border-indigo-200">
              {visibleSections.map(section =>
                section.isOpen ? (
                  section.cols.map((col, ci) => (
                    <th
                      key={col.key}
                      className={`px-2 py-1.5 text-right text-indigo-500 font-medium min-w-[80px] ${ci === 0 ? 'border-l border-indigo-200' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))
                ) : (
                  /* Seção fechada: coluna placeholder vazia */
                  <th
                    key={section.title + '-collapsed'}
                    className="px-2 py-1.5 text-center text-indigo-300 font-medium min-w-[28px] border-l border-indigo-200"
                  />
                )
              )}
            </tr>
          </thead>

          <tbody>
            {filteredData.map((row, i) => (
              <tr
                key={row.mes}
                className={`border-b border-indigo-50 hover:bg-indigo-50/30 transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                {/* Célula do mês — sticky */}
                <td className={`px-3 py-2 font-medium text-[#1e281e] sticky left-0 z-10 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  {fmtMonth(row.mes)}
                </td>

                {/* Células de dados */}
                {visibleSections.map(section =>
                  section.isOpen ? (
                    section.cols.map((col, ci) => {
                      const { display, color } = getCellDisplay(row, col)
                      return (
                        <td
                          key={col.key}
                          className={`px-2 py-2 text-right font-sans ${color || 'text-[#1e281e]'} ${ci === 0 ? 'border-l border-indigo-100' : ''}`}
                        >
                          {display}
                        </td>
                      )
                    })
                  ) : (
                    /* Seção fechada: célula vazia */
                    <td
                      key={section.title + '-collapsed-' + row.mes}
                      className="px-2 py-2 border-l border-indigo-100 text-center text-indigo-200 text-[10px]"
                    >
                      …
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </CollapsibleCard>
  )
}
