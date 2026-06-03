import { memo } from 'react'
import { NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export interface RoadmapImageData {
  src: string
}

function RoadmapImageNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RoadmapImageData
  const actions = useRoadmapActions()

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={40}
        minHeight={40}
        lineClassName="!border-[#1D9E75]"
        handleClassName="!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e]"
        keepAspectRatio
      />

      {actions && (
        <NodeToolbar isVisible={!!selected} position={Position.Top}>
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1">
            <button
              onClick={() => actions.onDelete(id)}
              title="Excluir"
              className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </NodeToolbar>
      )}

      <div className="w-full h-full cursor-grab active:cursor-grabbing">
        <img
          src={d.src}
          alt=""
          className="w-full h-full object-contain select-none"
          draggable={false}
        />
      </div>
    </>
  )
}

export default memo(RoadmapImageNode)
