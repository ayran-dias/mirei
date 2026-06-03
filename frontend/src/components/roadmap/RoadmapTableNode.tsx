import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar, type NodeProps, useUpdateNodeInternals } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export interface DropdownOption {
  value: string
  color?: string  // background color for this option
}

export interface RoadmapTableColumn {
  header: string
  hasCheckbox: boolean
  options?: string[]
  optionColors?: Record<string, string>  // value → bg color
}

export interface RoadmapTableCell {
  text: string
  checked?: boolean
}

export interface RoadmapTableRow {
  id: string
  cells: RoadmapTableCell[]
}

export interface RoadmapTableData {
  title?: string
  columns: RoadmapTableColumn[]
  rows: RoadmapTableRow[]
  headerColor?: string
  headerFontColor?: string
  stripeColor?: string
  fontColor?: string
  colWidths?: number[]  // pixel widths per column
}

// ── Inline editable text cell ─────────────────────────────────────────────────
function EditableCell({
  value,
  onCommit,
  className = '',
  style,
}: {
  value: string
  onCommit: (val: string) => void
  className?: string
  style?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep draft in sync when parent updates (e.g. adding rows)
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft !== value) onCommit(draft)
  }, [draft, value, onCommit])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          e.stopPropagation()
        }}
        onClick={e => e.stopPropagation()}
        className={`nodrag nopan w-full bg-white border border-[#00461e]/30 rounded px-1 py-0.5 text-[11px] outline-none focus:ring-1 focus:ring-[#00461e]/40 ${className}`}
        style={style}
        autoFocus
      />
    )
  }

  return (
    <span
      className={`block w-full cursor-text select-none truncate ${className}`}
      style={style}
      onDoubleClick={e => {
        e.stopPropagation()
        setEditing(true)
        setTimeout(() => inputRef.current?.focus(), 0)
      }}
      title="Duplo clique para editar"
    >
      {value || <span className="text-gray-300 italic">—</span>}
    </span>
  )
}

// ── Main node component ───────────────────────────────────────────────────────
function RoadmapTableNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RoadmapTableData
  const actions = useRoadmapActions()
  const updateNodeInternals = useUpdateNodeInternals()
  const [hovered, setHovered] = useState(false)
  const headerColor = d.headerColor ?? '#00461e'
  const headerFontColor = d.headerFontColor ?? '#ffffff'
  const stripeColor = d.stripeColor ?? '#f5fff5'
  const fontColor = d.fontColor ?? '#1A1A1A'
  const headerBtnRef = useRef<HTMLButtonElement>(null)
  const headerFontBtnRef = useRef<HTMLButtonElement>(null)
  const stripeBtnRef = useRef<HTMLButtonElement>(null)
  const fontBtnRef = useRef<HTMLButtonElement>(null)

  // ── Filters ──────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<Record<number, Set<string>>>({})
  const [filterOpen, setFilterOpen] = useState<number | null>(null)

  const toggleFilter = useCallback((colIdx: number) => {
    setFilterOpen(prev => prev === colIdx ? null : colIdx)
  }, [])

  const setFilterValues = useCallback((colIdx: number, values: Set<string>) => {
    setFilters(prev => {
      const next = { ...prev }
      if (values.size === 0) { delete next[colIdx] } else { next[colIdx] = values }
      return next
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({})
    setFilterOpen(null)
  }, [])

  const hasActiveFilters = Object.keys(filters).length > 0

  // Compute filtered rows
  const filteredRows = d.rows.filter(row =>
    Object.entries(filters).every(([colStr, vals]) => {
      const ci = Number(colStr)
      const cellVal = row.cells[ci]?.text ?? ''
      return vals.has(cellVal)
    })
  )
  // Get unique values per column for filter dropdown
  const uniqueValues = useCallback((colIdx: number) => {
    const vals = new Set<string>()
    d.rows.forEach(r => { const v = r.cells[colIdx]?.text; if (v) vals.add(v) })
    return Array.from(vals).sort()
  }, [d.rows])

  // Recalculate handles when rows change
  useEffect(() => {
    updateNodeInternals(id)
  }, [d.rows.length, id, updateNodeInternals])

  // ── Mutation helpers ──────────────────────────────────────────────────────
  const push = useCallback((next: RoadmapTableData) => {
    actions?.onTableChange?.(id, next)
  }, [actions, id])

  const updateTitle = useCallback((title: string) => {
    push({ ...d, title })
  }, [d, push])

  const updateCellText = useCallback((rowIdx: number, colIdx: number, text: string) => {
    const rows = d.rows.map((r, ri) =>
      ri !== rowIdx ? r : {
        ...r,
        cells: r.cells.map((c, ci) => ci !== colIdx ? c : { ...c, text }),
      }
    )
    push({ ...d, rows })
  }, [d, push])

  const toggleCheckbox = useCallback((rowIdx: number, colIdx: number) => {
    const rows = d.rows.map((r, ri) =>
      ri !== rowIdx ? r : {
        ...r,
        cells: r.cells.map((c, ci) =>
          ci !== colIdx ? c : { ...c, checked: !c.checked }
        ),
      }
    )
    push({ ...d, rows })
  }, [d, push])

  const addRow = useCallback(() => {
    const newRow: RoadmapTableRow = {
      id: `r-${Date.now()}`,
      cells: d.columns.map(col => ({ text: '', checked: col.hasCheckbox ? false : undefined })),
    }
    push({ ...d, rows: [...d.rows, newRow] })
  }, [d, push])

  const deleteRow = useCallback((rowIdx: number) => {
    push({ ...d, rows: d.rows.filter((_, i) => i !== rowIdx) })
  }, [d, push])

  const updateHeader = useCallback((colIdx: number, header: string) => {
    const columns = d.columns.map((c, i) => i !== colIdx ? c : { ...c, header })
    push({ ...d, columns })
  }, [d, push])

  const isEditor = !!actions

  // ── Active cell navigation (spreadsheet-style) ───────────────────────────
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null)
  const [editingCell, setEditingCell] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  // Navigate between cells with arrow keys; Enter/F2 to edit
  useEffect(() => {
    if (!activeCell) return
    const handler = (e: KeyboardEvent) => {
      // If editing (input focused), let the input handle keys except Escape/Tab/Enter
      if (editingCell) {
        if (e.key === 'Escape') { setEditingCell(false); e.preventDefault(); return }
        if (e.key === 'Tab') {
          setEditingCell(false)
          const { row, col } = activeCell
          let nextCol = col + (e.shiftKey ? -1 : 1), nextRow = row
          if (nextCol >= d.columns.length) { nextCol = 0; nextRow = Math.min(row + 1, filteredRows.length - 1) }
          if (nextCol < 0) { nextCol = d.columns.length - 1; nextRow = Math.max(row - 1, 0) }
          setActiveCell({ row: nextRow, col: nextCol })
          e.preventDefault()
          return
        }
        if (e.key === 'Enter') {
          setEditingCell(false)
          setActiveCell({ row: Math.min(activeCell.row + 1, filteredRows.length - 1), col: activeCell.col })
          e.preventDefault()
          return
        }
        return // Let input handle other keys
      }

      // Navigation mode
      const { row, col } = activeCell
      let nextRow = row, nextCol = col
      if (e.key === 'ArrowDown') { nextRow = Math.min(row + 1, filteredRows.length - 1); e.preventDefault() }
      else if (e.key === 'ArrowUp') { nextRow = Math.max(row - 1, 0); e.preventDefault() }
      else if (e.key === 'ArrowRight') { nextCol = Math.min(col + 1, d.columns.length - 1); e.preventDefault() }
      else if (e.key === 'ArrowLeft') { nextCol = Math.max(col - 1, 0); e.preventDefault() }
      else if (e.key === 'Tab') {
        nextCol = col + (e.shiftKey ? -1 : 1)
        if (nextCol >= d.columns.length) { nextCol = 0; nextRow = Math.min(row + 1, filteredRows.length - 1) }
        if (nextCol < 0) { nextCol = d.columns.length - 1; nextRow = Math.max(row - 1, 0) }
        e.preventDefault()
      }
      else if (e.key === 'Enter' || e.key === 'F2') { setEditingCell(true); e.preventDefault(); return }
      else if (e.key === 'Escape') { setActiveCell(null); return }
      else return
      if (nextRow !== row || nextCol !== col) setActiveCell({ row: nextRow, col: nextCol })
    }
    const wrappedHandler = (e: KeyboardEvent) => {
      handler(e)
      // Stop ReactFlow from panning on arrow/tab keys while table is active
      if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Tab','Enter','F2','Escape'].includes(e.key)) {
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', wrappedHandler, true)
    return () => window.removeEventListener('keydown', wrappedHandler, true)
  }, [activeCell, editingCell, filteredRows.length, d.columns.length])

  // Focus/blur the active cell
  useEffect(() => {
    if (!activeCell || !tableRef.current) return
    const row = tableRef.current.querySelectorAll('tbody tr')[activeCell.row]
    if (!row) return
    const editorOffset = isEditor ? 1 : 0
    const cell = row.querySelectorAll('td')[activeCell.col + editorOffset]
    if (!cell) return
    if (editingCell) {
      // Enter edit: focus the input/select or trigger dblclick
      const input = cell.querySelector('input:not([type=checkbox]), select') as HTMLElement
      if (input) { input.focus(); if ((input as HTMLInputElement).select) (input as HTMLInputElement).select() }
      else {
        const span = cell.querySelector('span[title]') as HTMLElement
        if (span) span.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      }
    } else {
      // Just highlight, blur any focused input
      const focused = tableRef.current.querySelector('input:focus, select:focus') as HTMLElement
      if (focused) focused.blur()
    }
  }, [activeCell, editingCell, isEditor])

  // ── Column resize ────────────────────────────────────────────────────────
  const colWidths = d.colWidths ?? d.columns.map(() => 0) // 0 = auto
  const resizeRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null)

  const onColResizeStart = useCallback((e: React.MouseEvent, colIdx: number) => {
    e.stopPropagation()
    e.preventDefault()
    // Measure actual column width from DOM if stored width is 0 (auto)
    const th = (e.target as HTMLElement).closest('tr')?.querySelectorAll('th')
    const editorOffset = isEditor ? 1 : 0 // skip the delete-column header
    const actualW = th?.[colIdx + editorOffset]?.getBoundingClientRect().width ?? 100
    const startW = colWidths[colIdx] || actualW
    resizeRef.current = { colIdx, startX: e.clientX, startW }

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = ev.clientX - resizeRef.current.startX
      const newW = Math.max(40, resizeRef.current.startW + delta)
      const updated = [...colWidths]
      while (updated.length < d.columns.length) updated.push(0)
      updated[resizeRef.current.colIdx] = Math.round(newW)
      push({ ...d, colWidths: updated })
    }
    const onMouseUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [colWidths, d, push, isEditor])

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={180}
        minHeight={80}
        lineClassName="!border-[#00461e]"
        handleClassName="!w-2 !h-2 !bg-[#00461e] !border-[#00461e]"
      />

      {actions && (
        <NodeToolbar isVisible={!!selected} position={Position.Top}>
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1">
            <button
              ref={headerBtnRef}
              onClick={() => headerBtnRef.current && actions.onOpenColorPicker(id, headerBtnRef.current.getBoundingClientRect(), 'headerColor')}
              title="Cor do cabecalho"
              className="flex items-center gap-1 text-[10px] font-bold px-2 h-6 rounded hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <span className="w-3 h-3 rounded-sm ring-1 ring-black/15 shrink-0" style={{ background: headerColor }} />
              Header
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button
              ref={headerFontBtnRef}
              onClick={() => headerFontBtnRef.current && actions.onOpenColorPicker(id, headerFontBtnRef.current.getBoundingClientRect(), 'headerFontColor')}
              title="Cor da fonte do cabecalho"
              className="flex items-center gap-1 text-[10px] font-bold px-2 h-6 rounded hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <span className="w-3 h-3 rounded-sm ring-1 ring-black/15 shrink-0" style={{ background: headerFontColor }} />
              Fonte Header
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button
              ref={stripeBtnRef}
              onClick={() => stripeBtnRef.current && actions.onOpenColorPicker(id, stripeBtnRef.current.getBoundingClientRect(), 'stripeColor')}
              title="Cor das linhas alternadas"
              className="flex items-center gap-1 text-[10px] font-bold px-2 h-6 rounded hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <span className="w-3 h-3 rounded-sm ring-1 ring-black/15 shrink-0" style={{ background: stripeColor }} />
              Linhas
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button
              ref={fontBtnRef}
              onClick={() => fontBtnRef.current && actions.onOpenColorPicker(id, fontBtnRef.current.getBoundingClientRect(), 'fontColor')}
              title="Cor da fonte do corpo"
              className="flex items-center gap-1 text-[10px] font-bold px-2 h-6 rounded hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <span className="w-3 h-3 rounded-sm ring-1 ring-black/15 shrink-0" style={{ background: fontColor }} />
              Fonte
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button
              onClick={() => actions.onEdit(id)}
              title="Editar colunas e opções"
              className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            >✎</button>
            <button
              onClick={() => actions.onDelete(id)}
              title="Excluir tabela"
              className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            >✕</button>
          </div>
        </NodeToolbar>
      )}

      <Handle
        id="top"
        type="target"
        position={Position.Top}
        className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`}
      />
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        className="w-full h-full flex flex-col font-['Manrope',sans-serif] overflow-hidden"
        style={{
          border: `2px solid ${headerColor}`,
          borderRadius: 8,
          background: '#fff',
          boxShadow: selected ? `0 0 0 2px ${headerColor}26` : '0 1px 4px rgba(0,0,0,0.08)',
          minWidth: 180,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Optional title above table */}
        {(d.title !== undefined) && (
          <div className="px-2 pt-1.5 pb-1 border-b border-black/10" style={{ background: stripeColor }}>
            {isEditor ? (
              <EditableCell
                value={d.title ?? ''}
                onCommit={updateTitle}
                className="font-bold text-[11px]"
                style={{ color: '#00461e' }}
              />
            ) : (
              <span className="font-bold text-[#00461e] text-[11px] block truncate">
                {d.title || <span className="opacity-0">—</span>}
              </span>
            )}
          </div>
        )}

        {/* Filter indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between px-2 py-0.5 bg-amber-50 border-b border-amber-200">
            <span className="text-[9px] text-amber-700 font-semibold">
              Filtrado: {filteredRows.length} de {d.rows.length} linhas
            </span>
            <button
              onClick={e => { e.stopPropagation(); clearAllFilters() }}
              className="nodrag nopan text-[9px] text-amber-600 hover:text-red-600 font-bold"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto" ref={tableRef}>
          <table className="w-full border-collapse text-[11px]" style={{ tableLayout: colWidths.some(w => w > 0) ? 'fixed' : 'auto' }}>
            {colWidths.some(w => w > 0) && (
              <colgroup>
                {isEditor && <col style={{ width: 20 }} />}
                {d.columns.map((_, ci) => (
                  <col key={ci} style={colWidths[ci] ? { width: colWidths[ci] } : undefined} />
                ))}
              </colgroup>
            )}
            <thead>
              <tr>
                {isEditor && <th className="w-5" style={{ background: headerColor }} />}
                {d.columns.map((col, ci) => (
                  <th
                    key={ci}
                    className="font-semibold px-2 py-1 text-left relative"
                    style={{ background: headerColor, fontSize: 11, color: headerFontColor }}
                  >
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        {isEditor ? (
                          <EditableCell
                            value={col.header}
                            onCommit={val => updateHeader(ci, val)}
                            style={{ color: headerFontColor }}
                          />
                        ) : (
                          <span className="block truncate">{col.header}</span>
                        )}
                      </div>
                      {/* Filter toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleFilter(ci) }}
                        className="nodrag nopan shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
                        title="Filtrar"
                        style={{ opacity: filters[ci] ? 1 : 0.5 }}
                      >
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M1.5 1.5h13L9.5 7.5v5l-3 2v-7L1.5 1.5z"/>
                        </svg>
                      </button>
                    </div>
                    {/* Filter dropdown */}
                    {filterOpen === ci && (
                      <div
                        className="nodrag nopan absolute top-full left-0 z-50 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-xl p-2 min-w-[140px] max-h-[200px] overflow-auto"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">Filtrar</span>
                          <button
                            onClick={() => { setFilterValues(ci, new Set()); setFilterOpen(null) }}
                            className="text-[9px] text-red-400 hover:text-red-600"
                          >Limpar</button>
                        </div>
                        {uniqueValues(ci).map(val => {
                          const active = filters[ci]?.has(val) ?? false
                          return (
                            <label key={val} className="flex items-center gap-1.5 py-0.5 cursor-pointer text-[10px] text-gray-700 hover:bg-gray-50 rounded px-1">
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => {
                                  const next = new Set(filters[ci] ?? [])
                                  if (active) next.delete(val); else next.add(val)
                                  setFilterValues(ci, next)
                                }}
                                className="accent-[#00461e] w-3 h-3"
                              />
                              <span className="truncate">{val}</span>
                            </label>
                          )
                        })}
                        {uniqueValues(ci).length === 0 && (
                          <span className="text-[10px] text-gray-300 italic">Sem valores</span>
                        )}
                      </div>
                    )}
                    {/* Column resize handle */}
                    {isEditor && (
                      <div
                        onMouseDown={e => onColResizeStart(e, ci)}
                        className="nodrag nopan absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-white/30 transition-colors"
                        style={{ zIndex: 10 }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, ri) => {
                const originalRi = d.rows.indexOf(row)
                return (
                <tr
                  key={row.id}
                  style={{ background: ri % 2 === 0 ? '#ffffff' : stripeColor }}
                >
                  {/* Delete button */}
                  {isEditor && (
                    <td className="w-5 text-center align-middle">
                      {d.rows.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteRow(originalRi) }}
                          className="nodrag nopan text-[#00461e]/40 hover:text-red-500 transition-colors leading-none"
                          title="Excluir linha"
                          style={{ fontSize: 10, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  )}
                  {row.cells.map((cell, ci) => {
                    const col = d.columns[ci]
                    const hasOptions = col?.options && col.options.length > 0
                    const optionBg = hasOptions && cell.text && col?.optionColors?.[cell.text]
                    const isActive = activeCell?.row === ri && activeCell?.col === ci
                    return (
                      <td
                        key={ci}
                        className={`px-2 py-1 align-middle border-b border-[#00461e]/10 ${isActive ? 'ring-2 ring-inset ring-[#1D9E75]' : ''}`}
                        style={{ fontSize: 11, color: fontColor, background: optionBg || undefined }}
                        onClick={() => isEditor && setActiveCell({ row: ri, col: ci })}
                      >
                        {col?.hasCheckbox ? (
                          <label className="flex items-center gap-1.5 cursor-pointer nodrag nopan" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!cell.checked}
                              onChange={() => isEditor && toggleCheckbox(originalRi, ci)}
                              disabled={!isEditor}
                              className="accent-[#00461e] w-3 h-3 shrink-0"
                            />
                            {isEditor ? (
                              hasOptions ? (
                                <select
                                  value={cell.text}
                                  onChange={e => { e.stopPropagation(); updateCellText(originalRi, ci, e.target.value) }}
                                  onClick={e => e.stopPropagation()}
                                  className="nodrag nopan w-full bg-transparent border border-transparent hover:border-[#00461e]/20 rounded px-0.5 py-0 text-[11px] outline-none focus:ring-1 focus:ring-[#00461e]/40 cursor-pointer"
                                  style={{ fontSize: 11, color: fontColor, fontFamily: 'inherit' }}
                                >
                                  <option value="">—</option>
                                  {col.options!.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <EditableCell
                                  value={cell.text}
                                  onCommit={val => updateCellText(originalRi, ci, val)}
                                  style={{ color: fontColor }}
                                />
                              )
                            ) : (
                              <span className={`truncate ${cell.checked ? 'line-through text-gray-400' : ''}`} style={{ color: cell.checked ? undefined : fontColor }}>
                                {cell.text}
                              </span>
                            )}
                          </label>
                        ) : hasOptions ? (
                          isEditor ? (
                            <select
                              value={cell.text}
                              onChange={e => { e.stopPropagation(); updateCellText(originalRi, ci, e.target.value) }}
                              onClick={e => e.stopPropagation()}
                              className="nodrag nopan w-full bg-transparent border border-transparent hover:border-[#00461e]/20 rounded px-0.5 py-0 text-[11px] outline-none focus:ring-1 focus:ring-[#00461e]/40 cursor-pointer"
                              style={{ fontSize: 11, color: fontColor, fontFamily: 'inherit' }}
                            >
                              <option value="">—</option>
                              {col!.options!.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="block truncate" style={{ color: fontColor }}>{cell.text}</span>
                          )
                        ) : (
                          isEditor ? (
                            <EditableCell
                              value={cell.text}
                              onCommit={val => updateCellText(originalRi, ci, val)}
                              style={{ color: fontColor }}
                            />
                          ) : (
                            <span className="block truncate" style={{ color: fontColor }}>{cell.text}</span>
                          )
                        )}
                      </td>
                    )
                  })}
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Footer: add row */}
        {isEditor && (
          <div className="border-t border-black/10" style={{ background: stripeColor }}>
            <button
              onClick={e => { e.stopPropagation(); addRow() }}
              className="nodrag nopan w-full flex items-center justify-center gap-1 py-1 text-[10px] font-bold text-[#00461e]/60 hover:text-[#00461e] hover:bg-[#00461e]/5 transition-colors"
              title="Adicionar linha"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Linha
            </button>
          </div>
        )}
      </div>

      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  )
}

export default memo(RoadmapTableNode)
