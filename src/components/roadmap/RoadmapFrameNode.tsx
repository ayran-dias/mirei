import { memo, useState, useRef, useCallback } from 'react'
import { Handle, Position, NodeResizer, type NodeProps, useReactFlow } from '@xyflow/react'
import { useRoadmapActions } from './RoadmapActionsContext'

export interface RoadmapFrameData {
  title: string
  titleSize?: number
  minimized?: boolean
  expandedHeight?: number
  containedNodeIds?: string[]
  color?: string
}

const TITLE_SIZE_OPTIONS = [12, 14, 16, 20, 24, 28, 32] as const
const HEADER_HEIGHT = 36

function RoadmapFrameNode({ id, data, selected }: NodeProps) {
  const d = data as unknown as RoadmapFrameData
  const actions = useRoadmapActions()
  const { getNodes, setNodes } = useReactFlow()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(d.title)
  const [sizeDraft, setSizeDraft] = useState(d.titleSize ?? 20)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const colorBtnRef = useRef<HTMLButtonElement>(null)
  const headerColor = d.color || '#00461e'

  const handleTitleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!actions) return
    setTitleDraft(d.title); setSizeDraft(d.titleSize ?? 20); setEditingTitle(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [d.title, d.titleSize, actions])

  const commitTitle = useCallback(() => {
    if (!actions) return
    setEditingTitle(false)
    actions.onFrameTitleChange(id, titleDraft.trim() || 'Frame', getNodes(), setNodes, sizeDraft)
  }, [actions, id, titleDraft, sizeDraft, getNodes, setNodes])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitTitle()
    if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(d.title) }
  }, [commitTitle, d.title])

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!actions) return
    actions.onFrameToggle(id, getNodes(), setNodes)
  }, [actions, id, getNodes, setNodes])

  const isMinimized = !!d.minimized

  return (
    <>
      {!isMinimized && (
        <NodeResizer isVisible={!!selected} minWidth={200} minHeight={80} lineClassName="!border-[#1D9E75]" handleClassName="!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e]" />
      )}
      <Handle id="top"    type="target" position={Position.Top}    className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
      <Handle id="left"   type="target" position={Position.Left}   className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />

      <div
        className="w-full h-full flex flex-col cursor-grab active:cursor-grabbing font-['Manrope',sans-serif]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border: selected ? `2px solid ${headerColor}66` : `2px dashed ${headerColor}40`,
          borderRadius: 8,
          background: isMinimized ? headerColor : 'rgba(255,255,255,0.95)',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between px-3 shrink-0"
          style={{ minHeight: HEADER_HEIGHT, padding: '6px 12px', background: headerColor, borderRadius: isMinimized ? '4px' : '4px 4px 0 0' }}>
          {editingTitle ? (
            <div className="nodrag nopan flex items-center flex-1 gap-1.5 min-w-0 mr-2">
              <input ref={inputRef} value={titleDraft} onChange={e => setTitleDraft(e.target.value)} onBlur={commitTitle} onKeyDown={handleTitleKeyDown}
                className="flex-1 bg-transparent text-white font-bold outline-none border-b border-white/40 min-w-0"
                style={{ fontFamily: 'Manrope, sans-serif', fontSize: sizeDraft }} onClick={e => e.stopPropagation()} />
              <select value={sizeDraft} onChange={e => setSizeDraft(Number(e.target.value))}
                className="bg-white/10 text-white text-[10px] rounded px-1 py-0.5 outline-none border border-white/20 cursor-pointer"
                onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                {TITLE_SIZE_OPTIONS.map(s => <option key={s} value={s} className="text-black">{s}px</option>)}
              </select>
            </div>
          ) : (
            <span className="flex-1 text-white font-bold truncate select-none mr-2"
              style={{ fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.01em', fontSize: d.titleSize ?? 20 }}
              onDoubleClick={handleTitleDoubleClick} title={actions ? 'Double click to edit' : undefined}>
              {d.title}
            </span>
          )}
          {actions && (
            <div className="flex items-center gap-1 shrink-0">
              <button ref={colorBtnRef}
                onClick={e => { e.stopPropagation(); colorBtnRef.current && actions.onOpenColorPicker(id, colorBtnRef.current.getBoundingClientRect()) }}
                title="Frame color" className="nodrag nopan w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 transition-colors">
                <span className="w-3 h-3 rounded-full ring-1 ring-white/40" style={{ background: headerColor }} />
              </button>
              <button onClick={handleToggle} title={isMinimized ? 'Restore' : 'Minimize'}
                className="nodrag nopan w-5 h-5 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors text-[11px]">
                {isMinimized ? '▴' : '▾'}
              </button>
            </div>
          )}
        </div>
        {!isMinimized && <div className="flex-1" />}
      </div>

      <Handle id="right"  type="source" position={Position.Right}  className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={`!w-2 !h-2 !bg-[#1D9E75] !border-[#00461e] transition-opacity duration-150 ${hovered || selected ? 'opacity-100' : 'opacity-0'}`} />
    </>
  )
}

export default memo(RoadmapFrameNode)
