import { memo, useCallback, useRef } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
  useReactFlow,
} from '@xyflow/react'

export interface Waypoint { x: number; y: number }

const edgeStyleMap: Record<string, React.CSSProperties> = {
  bold:     { stroke: '#00461e', strokeWidth: 3 },
  dashed:   { strokeDasharray: '8 4', stroke: '#00461e', strokeWidth: 1.5 },
  dotted:   { strokeDasharray: '2 4', stroke: '#00461e', strokeWidth: 1.5 },
  animated: { strokeDasharray: '8 4', stroke: '#00461e', strokeWidth: 1.5 },
}

/** Build orthogonal (90°) SVG path through source → waypoints → target with rounded corners */
function buildWaypointPath(
  sx: number, sy: number, tx: number, ty: number,
  waypoints: Waypoint[],
): string {
  // Build list of all points: source → waypoints → target
  const keyPts = [{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }]
  if (keyPts.length === 2) return `M ${sx},${sy} L ${tx},${ty}`

  // Expand key points into orthogonal segments (H then V between each pair)
  const orthoPts: { x: number; y: number }[] = [keyPts[0]]
  for (let i = 1; i < keyPts.length; i++) {
    const prev = orthoPts[orthoPts.length - 1]
    const curr = keyPts[i]
    if (prev.x !== curr.x && prev.y !== curr.y) {
      // Need a bend: go vertical first then horizontal (or vice versa based on direction)
      // For source→wp1: go vertical first (matches smoothstep behavior)
      // For wp→target: go horizontal first
      if (i <= waypoints.length) {
        orthoPts.push({ x: prev.x, y: curr.y }) // vertical then horizontal
      } else {
        orthoPts.push({ x: curr.x, y: prev.y }) // horizontal then vertical
      }
    }
    orthoPts.push(curr)
  }

  // Draw path with rounded corners
  const R = 6
  let d = `M ${orthoPts[0].x},${orthoPts[0].y}`
  for (let i = 1; i < orthoPts.length - 1; i++) {
    const prev = orthoPts[i - 1]
    const curr = orthoPts[i]
    const next = orthoPts[i + 1]
    const dxIn = curr.x - prev.x, dyIn = curr.y - prev.y
    const dxOut = next.x - curr.x, dyOut = next.y - curr.y
    const lenIn = Math.abs(dxIn) + Math.abs(dyIn)
    const lenOut = Math.abs(dxOut) + Math.abs(dyOut)
    if (lenIn === 0 || lenOut === 0) { d += ` L ${curr.x},${curr.y}`; continue }
    const r = Math.min(R, lenIn / 2, lenOut / 2)
    const ax = curr.x - (dxIn / lenIn) * r
    const ay = curr.y - (dyIn / lenIn) * r
    const bx = curr.x + (dxOut / lenOut) * r
    const by = curr.y + (dyOut / lenOut) * r
    d += ` L ${ax},${ay} Q ${curr.x},${curr.y} ${bx},${by}`
  }
  d += ` L ${orthoPts[orthoPts.length - 1].x},${orthoPts[orthoPts.length - 1].y}`
  return d
}

export default memo(function RoadmapEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  style, markerEnd, selected, data,
}: EdgeProps) {
  const { setEdges } = useReactFlow()
  const edgeData = data as Record<string, unknown> | undefined
  const waypoints = (edgeData?.waypoints as Waypoint[] | undefined) ?? []
  const edgeStyleKey = edgeData?.edgeStyle as string | undefined
  const customColor = edgeData?.color as string | undefined
  const baseStyle: React.CSSProperties = edgeStyleKey && edgeStyleMap[edgeStyleKey]
    ? edgeStyleMap[edgeStyleKey]
    : { stroke: selected ? '#00461e' : '#4a7a5a', strokeWidth: selected ? 2.5 : 1.8 }
  const computedStyle: React.CSSProperties = customColor ? { ...baseStyle, stroke: customColor } : baseStyle
  const animClass = edgeStyleKey === 'animated' ? 'roadmap-edge-animated' : ''

  // If no waypoints, use the normal smoothstep path
  const hasWaypoints = waypoints.length > 0
  const dist = Math.abs(targetX - sourceX) + Math.abs(targetY - sourceY)
  const offset = Math.max(4, Math.min(20, dist / 4))

  const [smoothPath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 6,
    offset,
  })

  const edgePath = hasWaypoints
    ? buildWaypointPath(sourceX, sourceY, targetX, targetY, waypoints)
    : smoothPath

  // Midpoint for the "add waypoint" handle (only when no waypoints exist)
  const midX = hasWaypoints ? 0 : labelX
  const midY = hasWaypoints ? 0 : labelY

  // Drag handler for waypoints
  const dragIdx = useRef<number | null>(null)
  const dragStart = useRef<{ x: number; y: number; wx: number; wy: number } | null>(null)

  const onWaypointMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation()
    e.preventDefault()
    dragIdx.current = idx
    // Get the SVG container to convert screen coords to flow coords
    const svg = (e.target as HTMLElement).closest('.react-flow')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    // Get current viewport transform from the SVG
    const viewport = svg.querySelector('.react-flow__viewport') as SVGGElement | null
    const transform = viewport?.style.transform ?? ''
    const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/)
    const tx = match ? parseFloat(match[1]) : 0
    const ty = match ? parseFloat(match[2]) : 0
    const zoom = match ? parseFloat(match[3]) : 1

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      wx: waypoints[idx].x,
      wy: waypoints[idx].y,
    }

    const onMouseMove = (ev: MouseEvent) => {
      if (dragIdx.current == null || !dragStart.current) return
      const dx = (ev.clientX - dragStart.current.x) / zoom
      const dy = (ev.clientY - dragStart.current.y) / zoom
      const newX = Math.round((dragStart.current.wx + dx) / 20) * 20
      const newY = Math.round((dragStart.current.wy + dy) / 20) * 20

      setEdges(eds => eds.map(edge => {
        if (edge.id !== id) return edge
        const wps = [...((edge.data as Record<string, unknown>)?.waypoints as Waypoint[] || [])]
        wps[dragIdx.current!] = { x: newX, y: newY }
        return { ...edge, data: { ...(edge.data as object || {}), waypoints: wps } }
      }))
    }

    const onMouseUp = () => {
      dragIdx.current = null
      dragStart.current = null
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [id, waypoints, setEdges])

  // Add waypoints at the bend positions of the smoothstep path
  const onAddWaypoint = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Compute the 2 corner points of a typical smoothstep path
    const midY = Math.round(((sourceY + targetY) / 2) / 20) * 20
    const midX = Math.round(((sourceX + targetX) / 2) / 20) * 20
    const isVertical = Math.abs(targetY - sourceY) > Math.abs(targetX - sourceX)
    let newWaypoints: Waypoint[]
    if (isVertical) {
      // Path goes: down from source → horizontal → down to target
      // Corners at (sourceX, midY) and (targetX, midY)
      newWaypoints = [
        { x: Math.round(sourceX / 20) * 20, y: midY },
        { x: Math.round(targetX / 20) * 20, y: midY },
      ]
    } else {
      // Path goes: right from source → vertical → right to target
      // Corners at (midX, sourceY) and (midX, targetY)
      newWaypoints = [
        { x: midX, y: Math.round(sourceY / 20) * 20 },
        { x: midX, y: Math.round(targetY / 20) * 20 },
      ]
    }
    setEdges(eds => eds.map(edge => {
      if (edge.id !== id) return edge
      return { ...edge, data: { ...(edge.data as object || {}), waypoints: newWaypoints } }
    }))
  }, [id, sourceX, sourceY, targetX, targetY, setEdges])

  // Remove waypoint on double-click
  const onRemoveWaypoint = useCallback((e: React.MouseEvent, idx: number) => {
    e.stopPropagation()
    e.preventDefault()
    setEdges(eds => eds.map(edge => {
      if (edge.id !== id) return edge
      const wps = [...((edge.data as Record<string, unknown>)?.waypoints as Waypoint[] || [])]
      wps.splice(idx, 1)
      return { ...edge, data: { ...(edge.data as object || {}), waypoints: wps } }
    }))
  }, [id, setEdges])

  return (
    <>
      {/* Hit area */}
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
        {/* Add-waypoint handle at midpoint (when no waypoints) */}
        {!hasWaypoints && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              onClick={onAddWaypoint}
              title="Clique para adicionar ponto de controle"
              className={`w-3 h-3 rounded-full border-2 bg-white transition-opacity duration-150 cursor-pointer
                ${selected ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
              style={{ borderColor: customColor || '#00461e', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
            />
          </div>
        )}
        {/* Draggable waypoint handles */}
        {waypoints.map((wp, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${wp.x}px, ${wp.y}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              onMouseDown={e => onWaypointMouseDown(e, idx)}
              onDoubleClick={e => onRemoveWaypoint(e, idx)}
              title="Arraste para mover · Duplo clique para remover"
              className="w-3.5 h-3.5 rounded-full border-2 bg-white cursor-grab active:cursor-grabbing transition-opacity duration-150"
              style={{
                borderColor: customColor || '#1D9E75',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                opacity: selected ? 1 : 0.7,
              }}
            />
          </div>
        ))}
      </EdgeLabelRenderer>
    </>
  )
})
