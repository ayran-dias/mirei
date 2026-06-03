import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar, type NodeProps, useUpdateNodeInternals } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export interface RoadmapCardData {
  title: string
  description: string
  status: 'backlog' | 'planned' | 'in-progress' | 'done'
  category: 'feature' | 'ajuste' | 'nova-entrega' | 'longo-prazo'
  expanded?: boolean
  color?: string
  align?: 'left' | 'center' | 'right'
}

const STATUS_STYLE: Record<string, {
  border: string
  bg: string
  text: string
  badge: string
  badgeBg: string
  label: string
  toggleColor: string
}> = {
  backlog: {
    border:      'border-[#e5e7eb]',
    bg:          'bg-[#f9fafb]',
    text:        'text-[#6b7280]',
    badge:       'text-[#6b7280]',
    badgeBg:     'bg-gray-100',
    label:       'Backlog',
    toggleColor: 'text-[#6b7280]',
  },
  planned: {
    border:      'border-[#ef4444]',
    bg:          'bg-[#fef2f2]',
    text:        'text-[#dc2626]',
    badge:       'text-[#dc2626]',
    badgeBg:     'bg-[#fee2e2]',
    label:       'Pendente',
    toggleColor: 'text-[#dc2626]',
  },
  'in-progress': {
    border:      'border-[#00d700]',
    bg:          'bg-[rgba(0,215,0,0.12)]',
    text:        'text-[#00461e]',
    badge:       'text-[#00461e]',
    badgeBg:     'bg-[rgba(0,215,0,0.12)]',
    label:       'Em andamento',
    toggleColor: 'text-[#00461e]',
  },
  done: {
    border:      'border-[#00461e]',
    bg:          'bg-[#00461e]',
    text:        'text-[#c7ff3d]',
    badge:       'text-[#c7ff3d]',
    badgeBg:     'bg-[#c7ff3d]/20',
    label:       'Concluído',
    toggleColor: 'text-[#c7ff3d]',
  },
}

const CAT_STYLE: Record<string, { icon: string; label: string; cls: string }> = {
  feature:        { icon: '★', label: 'Feature',       cls: 'bg-[#00461e] text-[#c7ff3d]' },
  ajuste:         { icon: '⚙', label: 'Ajuste',        cls: 'bg-[#1D9E75]/10 text-[#1D9E75]' },
  'nova-entrega': { icon: '→', label: 'Nova Entrega',  cls: 'bg-[#c7ff3d]/30 text-[#00461e]' },
  'longo-prazo':  { icon: '◎', label: 'Longo Prazo',   cls: 'bg-gray-100 text-gray-500' },
}

const STATUS_ORDER: Array<'backlog' | 'planned' | 'in-progress' | 'done'> = ['backlog', 'planned', 'in-progress', 'done']
const STATUS_TOOLBAR = [
  { key: 'backlog',      icon: '○', title: 'Backlog',       color: 'text-gray-400 hover:text-gray-700' },
  { key: 'planned',      icon: '◷', title: 'Pendente',      color: 'text-[#ef4444] hover:text-[#dc2626]' },
  { key: 'in-progress',  icon: '▶', title: 'Em andamento',  color: 'text-[#00d700] hover:text-[#00a800]' },
  { key: 'done',         icon: '✓', title: 'Concluído',     color: 'text-[#00461e] hover:text-[#002f14]' },
]

function RoadmapCardNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RoadmapCardData
  const s = STATUS_STYLE[d.status] || STATUS_STYLE.backlog
  const c = CAT_STYLE[d.category] || CAT_STYLE.feature
  const isDone = d.status === 'done'
  const customColor = d.color
  const textAlign = d.align ?? 'left'
  const actions = useRoadmapActions()
  const updateNodeInternals = useUpdateNodeInternals()
  const colorBtnRef = useRef<HTMLButtonElement>(null)

  const [expanded, setExpanded] = useState<boolean>(d.expanded ?? true)
  const [hovered, setHovered] = useState(false)

  // Notify ReactFlow to recalculate handle positions when height changes
  useEffect(() => {
    updateNodeInternals(id)
  }, [expanded, id, updateNodeInternals])

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(prev => !prev)
  }

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={180}
        minHeight={expanded ? 100 : 60}
        lineClassName="!border-[#1D9E75]"
        handleClassName="!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e]"
      />

      {/* Node Toolbar — floating above node on select (only for editors) */}
      <NodeToolbar isVisible={!!selected && !!actions} position={Position.Top}>
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1">
          {STATUS_TOOLBAR.map(st => (
            <button
              key={st.key}
              onClick={() => actions.onStatusChange(id, st.key)}
              title={st.title}
              className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors ${st.color} ${d.status === st.key ? 'ring-1 ring-gray-300 bg-gray-50' : ''}`}
            >
              {st.icon}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button
            ref={colorBtnRef}
            onClick={() => colorBtnRef.current && actions.onOpenColorPicker(id, colorBtnRef.current.getBoundingClientRect())}
            title="Cor"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
          >
            <span className="w-3.5 h-3.5 rounded-full ring-1 ring-black/15" style={{ background: customColor || '#e5e7eb' }} />
          </button>
          <button
            onClick={() => actions.onEdit(id)}
            title="Editar"
            className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
          >
            ✎
          </button>
          <button
            onClick={() => actions.onDelete(id)}
            title="Excluir"
            className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
          >
            ✕
          </button>
        </div>
      </NodeToolbar>

      <Handle id="top"    type="target" position={Position.Top}    className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
      <Handle id="left"   type="target" position={Position.Left}   className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />

      <div
        className={`${customColor ? '' : s.bg} ${customColor ? '' : s.border} border-2 rounded-xl px-3 py-2.5 shadow-sm cursor-grab active:cursor-grabbing font-['Manrope',sans-serif] transition-all duration-150`}
        style={{
          width: '100%',
          height: '100%',
          minHeight: expanded ? 120 : 60,
          ...(customColor ? { borderColor: customColor, backgroundColor: customColor + '1a' } : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Header row: badges + toggle */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Status badge */}
            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.badgeBg} ${s.badge}`}>
              {s.label}
            </span>
            {/* Category badge */}
            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.cls}`}>
              {c.icon} {c.label}
            </span>
          </div>

          {/* Toggle button — nodrag prevents accidental drag on click */}
          <button
            onClick={toggleExpanded}
            title={expanded ? 'Minimizar' : 'Expandir'}
            className={`nodrag nopan shrink-0 w-4 h-4 flex items-center justify-center rounded text-[10px] leading-none transition-colors hover:opacity-70 ${s.toggleColor}`}
            style={{ fontSize: 10 }}
          >
            {expanded ? '▴' : '▾'}
          </button>
        </div>

        {/* Title — always visible */}
        <p className={`text-sm font-bold leading-tight mt-1.5 ${isDone ? 'text-[#c7ff3d]' : 'text-[#1A1A1A]'}`} style={{ textAlign }}>
          {d.title}
        </p>

        {/* Description — only when expanded */}
        {expanded && d.description && (
          <p className={`text-[11px] mt-1.5 leading-relaxed whitespace-pre-wrap ${isDone ? 'text-white/60' : 'text-gray-500'}`} style={{ textAlign }}>
            {d.description}
          </p>
        )}
      </div>

      <Handle id="right"  type="source" position={Position.Right}  className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
    </>
  )
}

export default memo(RoadmapCardNode)
