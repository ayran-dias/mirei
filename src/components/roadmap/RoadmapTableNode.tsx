import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { Handle, Position, NodeResizer, type NodeProps, useUpdateNodeInternals } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export interface RoadmapTableColumn {
  header: string
  hasCheckbox: boolean
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
}

// ── Inline editable text cell ─────────────────────────────────────────────────
function EditableCell({
  value,
  onCommit,
  className = '',
}: {
  value: string
  onCommit: (val: string) => void
  className?: string
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
        autoFocus
      />
    )
  }

  return (
    <span
      className={`block w-full cursor-text select-none truncate ${className}`}
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

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={180}
        minHeight={80}
        lineClassName="!border-[#00461e]"
        handleClassName="!w-2 !h-2 !bg-[#00461e] !border-[#00461e]"
      />

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
          border: `2px solid #00461e`,
          borderRadius: 8,
          background: '#fff',
          boxShadow: selected ? '0 0 0 2px rgba(0,70,30,0.15)' : '0 1px 4px rgba(0,0,0,0.08)',
          minWidth: 180,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Optional title above table */}
        {(d.title !== undefined) && (
          <div className="px-2 pt-1.5 pb-1 border-b border-[#00461e]/20 bg-[#f5fff5]">
            {isEditor ? (
              <EditableCell
                value={d.title ?? ''}
                onCommit={updateTitle}
                className="font-bold text-[#00461e] text-[11px]"
              />
            ) : (
              <span className="font-bold text-[#00461e] text-[11px] block truncate">
                {d.title || <span className="opacity-0">—</span>}
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-[11px]" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                {/* Row-delete column header (blank) */}
                {isEditor && <th className="w-5 bg-[#00461e]" />}
                {d.columns.map((col, ci) => (
                  <th
                    key={ci}
                    className="bg-[#00461e] text-white font-semibold px-2 py-1 text-left"
                    style={{ fontSize: 11 }}
                  >
                    {isEditor ? (
                      <EditableCell
                        value={col.header}
                        onCommit={val => updateHeader(ci, val)}
                        className="text-white"
                      />
                    ) : (
                      <span className="block truncate">{col.header}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.rows.map((row, ri) => (
                <tr
                  key={row.id}
                  className={ri % 2 === 0 ? 'bg-white' : 'bg-[#f5fff5]'}
                >
                  {/* Delete button */}
                  {isEditor && (
                    <td className="w-5 text-center align-middle">
                      {d.rows.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteRow(ri) }}
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
                    return (
                      <td
                        key={ci}
                        className="px-2 py-1 align-middle border-b border-[#00461e]/10"
                        style={{ fontSize: 11 }}
                      >
                        {col?.hasCheckbox ? (
                          <label className="flex items-center gap-1.5 cursor-pointer nodrag nopan" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!cell.checked}
                              onChange={() => isEditor && toggleCheckbox(ri, ci)}
                              disabled={!isEditor}
                              className="accent-[#00461e] w-3 h-3 shrink-0"
                            />
                            {isEditor ? (
                              <EditableCell
                                value={cell.text}
                                onCommit={val => updateCellText(ri, ci, val)}
                                className="text-[#1A1A1A]"
                              />
                            ) : (
                              <span className={`truncate ${cell.checked ? 'line-through text-gray-400' : 'text-[#1A1A1A]'}`}>
                                {cell.text}
                              </span>
                            )}
                          </label>
                        ) : (
                          isEditor ? (
                            <EditableCell
                              value={cell.text}
                              onCommit={val => updateCellText(ri, ci, val)}
                              className="text-[#1A1A1A]"
                            />
                          ) : (
                            <span className="block truncate text-[#1A1A1A]">{cell.text}</span>
                          )
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer: add row */}
        {isEditor && (
          <div className="border-t border-[#00461e]/20 bg-[#f5fff5]">
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
