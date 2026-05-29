import { memo } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'

export interface RoadmapLabelData {
  text: string
  fontSize?: number
  color?: string
}

function RoadmapLabelNode({ data, selected }: NodeProps) {
  const d = data as unknown as RoadmapLabelData
  const size = d.fontSize || 24
  const color = d.color || '#1A1A1A'

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={80}
        minHeight={30}
        lineClassName="!border-[#1D9E75]"
        handleClassName="!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e]"
      />
      <div className="w-full h-full flex items-center cursor-grab active:cursor-grabbing select-none px-2">
        <span style={{ fontSize: size, color, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {d.text}
        </span>
      </div>
    </>
  )
}

export default memo(RoadmapLabelNode)
