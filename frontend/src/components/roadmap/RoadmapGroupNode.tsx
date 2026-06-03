import { memo, useState } from 'react'
import { Handle, Position, NodeResizer, NodeToolbar, type NodeProps } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export interface RoadmapGroupData {
  containedNodeIds?: string[]
}

function RoadmapGroupNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RoadmapGroupData
  const actions = useRoadmapActions()
  const [hovered, setHovered] = useState(false)

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={60}
        minHeight={60}
        lineClassName="!border-[#6366f1]"
        handleClassName="!w-2 !h-2 !bg-[#6366f1] !border-[#4338ca]"
      />

      {actions && (
        <NodeToolbar isVisible={!!selected} position={Position.Top}>
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1">
            <button
              onClick={() => actions.onUngroup?.(id)}
              title="Desagrupar"
              className="text-[10px] font-bold px-2 h-6 flex items-center gap-1 rounded hover:bg-gray-100 text-[#6366f1] hover:text-[#4338ca] transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2M16 4h2a2 2 0 012 2v2M16 20h2a2 2 0 002-2v-2" />
              </svg>
              Desagrupar
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button
              onClick={() => actions.onDelete(id)}
              title="Excluir grupo"
              className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </NodeToolbar>
      )}

      <Handle id="top"    type="target" position={Position.Top}    className={`!w-2 !h-2 !bg-[#6366f1] !border-[#4338ca] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
      <Handle id="left"   type="target" position={Position.Left}   className={`!w-2 !h-2 !bg-[#6366f1] !border-[#4338ca] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />

      <div
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{
          border: selected ? '2px solid #6366f1' : '2px dashed #a5b4fc',
          borderRadius: 8,
          background: selected ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.02)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <Handle id="right"  type="source" position={Position.Right}  className={`!w-2 !h-2 !bg-[#6366f1] !border-[#4338ca] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={`!w-2 !h-2 !bg-[#6366f1] !border-[#4338ca] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
    </>
  )
}

export default memo(RoadmapGroupNode)
