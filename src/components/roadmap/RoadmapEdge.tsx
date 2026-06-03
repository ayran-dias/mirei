import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'

const edgeStyleMap: Record<string, React.CSSProperties> = {
  bold:     { stroke: '#00461e', strokeWidth: 3 },
  dashed:   { strokeDasharray: '8 4', stroke: '#00461e', strokeWidth: 1.5 },
  dotted:   { strokeDasharray: '2 4', stroke: '#00461e', strokeWidth: 1.5 },
  animated: { strokeDasharray: '8 4', stroke: '#00461e', strokeWidth: 1.5 },
}

export default memo(function RoadmapEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, selected, data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const edgeData = data as Record<string, unknown> | undefined
  const edgeStyleKey = edgeData?.edgeStyle as string | undefined
  const customColor = edgeData?.color as string | undefined
  const baseStyle: React.CSSProperties = edgeStyleKey && edgeStyleMap[edgeStyleKey]
    ? edgeStyleMap[edgeStyleKey]
    : { stroke: selected ? '#00461e' : '#b0c4b0', strokeWidth: selected ? 2 : 1.5 }
  const computedStyle: React.CSSProperties = customColor ? { ...baseStyle, stroke: customColor } : baseStyle

  const animClass = edgeStyleKey === 'animated' ? 'roadmap-edge-animated' : ''

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-interaction"
        d={edgePath}
        strokeWidth={20}
        stroke="transparent"
        fill="none"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={animClass}
        style={{ ...style, ...computedStyle }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className={`w-3 h-3 rounded-full border-2 bg-white transition-opacity duration-150 cursor-grab
              ${selected ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
            style={{ borderColor: customColor || '#00461e', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  )
})
