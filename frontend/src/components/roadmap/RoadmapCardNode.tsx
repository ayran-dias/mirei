import { memo } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar, type NodeProps } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export interface RoadmapCardData {
  title: string
  description: string
  status: 'backlog' | 'planned' | 'in-progress' | 'done'
  category: 'feature' | 'ajuste' | 'nova-entrega' | 'longo-prazo'
}

const STATUS_STYLE: Record<string, { border: string; bg: string; badge: string; badgeBg: string; label: string }> = {
  backlog:       { border: 'border-gray-300',    bg: 'bg-white',        badge: 'text-gray-500',     badgeBg: 'bg-gray-100',     label: 'Backlog' },
  planned:       { border: 'border-[#1D9E75]',   bg: 'bg-[#f0faf5]',   badge: 'text-[#1D9E75]',    badgeBg: 'bg-[#e0f5ec]',    label: 'Pendente' },
  'in-progress': { border: 'border-[#00d700]',   bg: 'bg-[#f0fff0]',   badge: 'text-[#00461e]',    badgeBg: 'bg-[#c7ff3d]/30', label: 'Em andamento' },
  done:          { border: 'border-[#00461e]',   bg: 'bg-[#00461e]',   badge: 'text-[#c7ff3d]',    badgeBg: 'bg-[#c7ff3d]/20', label: 'Concluído' },
}

const CAT_LABEL: Record<string, { icon: string; label: string }> = {
  feature:        { icon: '★', label: 'Feature' },
  ajuste:         { icon: '⚙', label: 'Ajuste' },
  'nova-entrega': { icon: '→', label: 'Nova Entrega' },
  'longo-prazo':  { icon: '◎', label: 'Longo Prazo' },
}

const STATUS_ORDER: Array<'backlog' | 'planned' | 'in-progress' | 'done'> = ['backlog', 'planned', 'in-progress', 'done']
const STATUS_TOOLBAR = [
  { key: 'backlog',      icon: '○', title: 'Backlog',       color: 'text-gray-400 hover:text-gray-700' },
  { key: 'planned',      icon: '◷', title: 'Pendente',      color: 'text-[#1D9E75] hover:text-[#148a60]' },
  { key: 'in-progress',  icon: '▶', title: 'Em andamento',  color: 'text-[#00d700] hover:text-[#00a800]' },
  { key: 'done',         icon: '✓', title: 'Concluído',     color: 'text-[#00461e] hover:text-[#002f14]' },
]

function RoadmapCardNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RoadmapCardData
  const s = STATUS_STYLE[d.status] || STATUS_STYLE.backlog
  const c = CAT_LABEL[d.category] || CAT_LABEL.feature
  const isDone = d.status === 'done'
  const actions = useRoadmapActions()

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={180}
        minHeight={80}
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

      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e]" />
      <div className={`${s.bg} ${s.border} border-2 rounded-xl px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing`} style={{ width: 230, minHeight: 80 }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${s.badgeBg} ${s.badge}`}>{s.label}</span>
          <span className={`text-[10px] ${isDone ? 'text-white/50' : 'text-gray-400'}`}>{c.icon} {c.label}</span>
        </div>
        <p className={`text-sm font-bold leading-tight ${isDone ? 'text-white' : 'text-[#1A1A1A]'}`}>{d.title}</p>
        {d.description && (
          <p className={`text-[11px] mt-1 leading-relaxed ${isDone ? 'text-white/60' : 'text-gray-500'}`}>{d.description}</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e]" />
    </>
  )
}

export default memo(RoadmapCardNode)
