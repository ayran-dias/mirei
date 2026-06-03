import { memo, useRef } from 'react'
import { NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export interface RoadmapLabelData {
  text: string
  fontSize?: number
  color?: string
}

function RoadmapLabelNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RoadmapLabelData
  const size = d.fontSize || 24
  const color = d.color || '#1A1A1A'
  const actions = useRoadmapActions()
  const colorBtnRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={80}
        minHeight={30}
        lineClassName="!border-[#1D9E75]"
        handleClassName="!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e]"
      />
      <NodeToolbar isVisible={!!selected && !!actions} position={Position.Top}>
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1">
          <button
            ref={colorBtnRef}
            onClick={() => colorBtnRef.current && actions.onOpenColorPicker(id, colorBtnRef.current.getBoundingClientRect())}
            title="Text color"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
          >
            <span className="w-3.5 h-3.5 rounded-full ring-1 ring-black/15" style={{ background: color }} />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button onClick={() => actions.onEdit(id)} title="Edit" className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">✎</button>
          <button onClick={() => actions.onDelete(id)} title="Delete" className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">✕</button>
        </div>
      </NodeToolbar>
      <div className="w-full h-full flex items-center cursor-grab active:cursor-grabbing select-none px-2">
        <span style={{ fontSize: size, color, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {d.text}
        </span>
      </div>
    </>
  )
}

export default memo(RoadmapLabelNode)
