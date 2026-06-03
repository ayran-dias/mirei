import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar, type NodeProps, useUpdateNodeInternals } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export type CardShape = 'rect' | 'rounded' | 'diamond' | 'circle' | 'parallelogram' | 'hexagon' | 'triangle' | 'cylinder'

export interface RoadmapCardData {
  title: string
  description: string
  status: 'backlog' | 'planned' | 'in-progress' | 'done'
  category: 'feature' | 'ajuste' | 'nova-entrega' | 'longo-prazo'
  expanded?: boolean
  color?: string
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  shape?: CardShape
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

// Cores hex para preencher o SVG (paralelas às classes Tailwind do STATUS_STYLE)
const STATUS_HEX: Record<string, { fill: string; stroke: string }> = {
  backlog:       { fill: '#f9fafb', stroke: '#e5e7eb' },
  planned:       { fill: '#fef2f2', stroke: '#ef4444' },
  'in-progress': { fill: 'rgba(0,215,0,0.12)', stroke: '#00d700' },
  done:          { fill: '#00461e', stroke: '#00461e' },
}

// Inset do conteúdo dentro de cada forma (espaço para o SVG não cobrir o texto)
const SHAPE_INSET: Record<string, React.CSSProperties> = {
  rect:          { padding: '10px 12px' },
  rounded:       { padding: '10px 14px' },
  diamond:       { padding: '28% 14%' },
  circle:        { padding: '16% 12%' },
  parallelogram: { padding: '8px 26px' },
  hexagon:       { padding: '8px 22px' },
  triangle:      { padding: '44% 14% 8%' },
  cylinder:      { padding: '22px 12px 10px' },
}

function CardShapeSVG({ shape, fill, stroke }: { shape: CardShape; fill: string; stroke: string }) {
  const p = { fill, stroke, strokeWidth: 2, vectorEffect: 'non-scaling-stroke' as const }
  if (shape === 'rounded')      return <rect x="0.01" y="0.01" width="0.98" height="0.98" rx="0.12" {...p} />
  if (shape === 'diamond')      return <polygon points="0.5,0.01 0.99,0.5 0.5,0.99 0.01,0.5" {...p} />
  if (shape === 'circle')       return <ellipse cx="0.5" cy="0.5" rx="0.49" ry="0.49" {...p} />
  if (shape === 'parallelogram') return <polygon points="0.16,0.01 0.99,0.01 0.84,0.99 0.01,0.99" {...p} />
  if (shape === 'hexagon')      return <polygon points="0.25,0.01 0.75,0.01 0.99,0.5 0.75,0.99 0.25,0.99 0.01,0.5" {...p} />
  if (shape === 'triangle')     return <polygon points="0.5,0.03 0.97,0.97 0.03,0.97" {...p} />
  if (shape === 'cylinder') return (
    <>
      <path d="M0.01,0.15 L0.01,0.85 A0.5,0.15 0 0,0 0.99,0.85 L0.99,0.15" fill={fill} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <ellipse cx="0.5" cy="0.85" rx="0.49" ry="0.14" fill={fill} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <ellipse cx="0.5" cy="0.15" rx="0.49" ry="0.14" fill={fill} stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </>
  )
  return null
}

function RoadmapCardNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RoadmapCardData
  const s = STATUS_STYLE[d.status] || STATUS_STYLE.backlog
  const c = CAT_STYLE[d.category] || CAT_STYLE.feature
  const isDone = d.status === 'done'
  const customColor = d.color
  const textAlign = d.align ?? 'left'
  const justifyContent = d.valign === 'middle' ? 'center' : d.valign === 'bottom' ? 'flex-end' : 'flex-start'
  const shape = d.shape ?? 'rect'
  const isShaped = shape !== 'rect'
  const hex = STATUS_HEX[d.status] || STATUS_HEX.backlog
  const shapeFill   = customColor ? customColor + '1a' : hex.fill
  const shapeStroke = customColor || hex.stroke
  const contentInset = SHAPE_INSET[shape] ?? SHAPE_INSET.rect
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
          {actions.onZIndexChange && (<>
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button onClick={() => actions.onZIndexChange!(id, 'forward')}  title="Avançar camada" className="text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors">↑</button>
            <button onClick={() => actions.onZIndexChange!(id, 'backward')} title="Recuar camada"  className="text-[10px] font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors">↓</button>
            <button onClick={() => actions.onZIndexChange!(id, 'front')}    title="Trazer para frente" className="text-[9px] font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors">⇈</button>
            <button onClick={() => actions.onZIndexChange!(id, 'back')}     title="Enviar para trás"  className="text-[9px] font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors">⇊</button>
          </>)}
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
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
        className={`${isShaped ? '' : `${customColor ? '' : s.bg} ${customColor ? '' : s.border} border-2 rounded-xl`} cursor-grab active:cursor-grabbing font-['Manrope',sans-serif] transition-all duration-150 relative`}
        style={{
          width: '100%',
          height: '100%',
          minHeight: expanded ? 120 : 60,
          ...(!isShaped && customColor ? { borderColor: customColor, backgroundColor: customColor + '1a' } : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* SVG shape background */}
        {isShaped && (
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
          >
            <CardShapeSVG shape={shape} fill={shapeFill} stroke={shapeStroke} />
          </svg>
        )}

        {/* Content */}
        <div
          className="flex flex-col h-full"
          style={{ position: 'relative', zIndex: 1, ...contentInset }}
        >
          {/* Header row: badges + toggle — sempre no topo */}
          <div className="flex items-center justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {d.status && s && (
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.badgeBg} ${s.badge}`}>
                  {s.label}
                </span>
              )}
              {d.category && c && (
                <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.cls}`}>
                  {c.icon} {c.label}
                </span>
              )}
            </div>
            <button
              onClick={toggleExpanded}
              title={expanded ? 'Minimizar' : 'Expandir'}
              className={`nodrag nopan shrink-0 w-4 h-4 flex items-center justify-center rounded text-[10px] leading-none transition-colors hover:opacity-70 ${s.toggleColor}`}
              style={{ fontSize: 10 }}
            >
              {expanded ? '▴' : '▾'}
            </button>
          </div>

          {/* Título + descrição — alinhamento vertical aplicado aqui */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ justifyContent }}>
            <p className={`text-sm font-bold leading-tight mt-1.5 ${isDone ? 'text-[#c7ff3d]' : 'text-[#1A1A1A]'}`} style={{ textAlign }}>
              {d.title}
            </p>
            {expanded && d.description && (
              <p className={`text-[11px] mt-1.5 leading-relaxed whitespace-pre-wrap ${isDone ? 'text-white/60' : 'text-gray-500'}`} style={{ textAlign }}>
                {d.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <Handle id="right"  type="source" position={Position.Right}  className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
    </>
  )
}

export default memo(RoadmapCardNode)
