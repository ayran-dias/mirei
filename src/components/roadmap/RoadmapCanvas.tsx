import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  useReactFlow,
  ReactFlowProvider,
  SelectionMode,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react'
import { toPng } from 'html-to-image'
import RoadmapCardNode, { type RoadmapCardData } from './RoadmapCardNode'
import RoadmapLabelNode, { type RoadmapLabelData } from './RoadmapLabelNode'
import RoadmapFrameNode, { type RoadmapFrameData } from './RoadmapFrameNode'
import RoadmapTableNode, { type RoadmapTableData } from './RoadmapTableNode'
import RoadmapEditModal from './RoadmapEditModal'
import RoadmapEdge from './RoadmapEdge'
import { RoadmapActionsContext, type RoadmapActions } from './RoadmapActionsContext'
import ColorPicker from './ColorPicker'

interface Props {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  isEditor?: boolean
  initialViewport?: { x: number; y: number; zoom: number }
  initialCustomColors?: string[]
  onSave?: (json: string) => void
  onSaveDefault?: (json: string) => void
}

const nodeTypes = { card: RoadmapCardNode, label: RoadmapLabelNode, frame: RoadmapFrameNode, table: RoadmapTableNode }
const edgeTypes = { smoothstep: RoadmapEdge }

interface ContextMenuState {
  x: number
  y: number
  flowX: number
  flowY: number
  nodeId: string | null
  edgeId?: string
}

function LabelModal({ open, initial, onSave, onDelete, onClose }: {
  open: boolean; initial: RoadmapLabelData | null; onSave: (text: string, fontSize: number) => void; onDelete?: () => void; onClose: () => void
}) {
  const [text, setText] = useState(initial?.text || '')
  const [fontSize, setFontSize] = useState(initial?.fontSize || 24)
  const isNew = !initial

  if (open && initial && text === '' && fontSize === 24) {
    setText(initial.text); setFontSize(initial.fontSize || 24)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#1A1A1A] px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">{isNew ? 'Novo texto' : 'Editar texto'}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Texto</label>
            <input value={text} onChange={e => setText(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" autoFocus />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tamanho da fonte: {fontSize}px</label>
            <input type="range" min={12} max={64} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="mt-1 w-full" />
            <div className="mt-2 p-2 bg-gray-50 rounded" style={{ fontSize, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em' }}>{text || 'Preview'}</div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <div>{!isNew && onDelete && <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">Excluir</button>}</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-xs text-gray-400 px-3 py-1.5">Cancelar</button>
            <button onClick={() => text.trim() && onSave(text, fontSize)} disabled={!text.trim()} className="text-xs font-bold text-white bg-[#1D9E75] hover:bg-[#178a64] disabled:bg-gray-300 px-4 py-1.5 rounded-lg">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TableConfigModal ──────────────────────────────────────────────────────────
function TableConfigModal({ open, atPosition, onSave, onClose }: {
  open: boolean
  atPosition: { x: number; y: number } | null
  onSave: (data: RoadmapTableData, pos?: { x: number; y: number }) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [columns, setColumns] = useState<{ header: string; hasCheckbox: boolean }[]>([
    { header: 'Item', hasCheckbox: false },
    { header: 'Status', hasCheckbox: true },
  ])

  // Reset when opened
  useEffect(() => {
    if (open) {
      setTitle('')
      setColumns([
        { header: 'Item', hasCheckbox: false },
        { header: 'Status', hasCheckbox: true },
      ])
    }
  }, [open])

  if (!open) return null

  const addColumn = () => setColumns(c => [...c, { header: `Coluna ${c.length + 1}`, hasCheckbox: false }])
  const removeColumn = (i: number) => {
    if (columns.length <= 1) return
    setColumns(c => c.filter((_, ci) => ci !== i))
  }
  const updateHeader = (i: number, header: string) =>
    setColumns(c => c.map((col, ci) => ci === i ? { ...col, header } : col))
  const toggleCheckbox = (i: number) =>
    setColumns(c => c.map((col, ci) => ci === i ? { ...col, hasCheckbox: !col.hasCheckbox } : col))

  const handleCreate = () => {
    const rows = [
      { id: 'r1', cells: columns.map(col => ({ text: '', checked: col.hasCheckbox ? false : undefined })) },
      { id: 'r2', cells: columns.map(col => ({ text: '', checked: col.hasCheckbox ? false : undefined })) },
      { id: 'r3', cells: columns.map(col => ({ text: '', checked: col.hasCheckbox ? false : undefined })) },
    ]
    onSave({ title, columns, rows }, atPosition ?? undefined)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-[#00461e] px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Nova tabela</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Título (opcional)</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Checklist de entrega"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00461e]/30"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Colunas</label>
              <button onClick={addColumn} className="text-[10px] font-bold text-[#00461e] hover:underline flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {columns.map((col, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={col.header}
                    onChange={e => updateHeader(i, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#00461e]/30"
                    placeholder="Nome da coluna"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer select-none whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={col.hasCheckbox}
                      onChange={() => toggleCheckbox(i)}
                      className="accent-[#00461e] w-3 h-3"
                    />
                    Checkbox
                  </label>
                  <button
                    onClick={() => removeColumn(i)}
                    disabled={columns.length <= 1}
                    className="text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                    title="Remover coluna"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-xs text-gray-400 px-3 py-1.5">Cancelar</button>
          <button
            onClick={handleCreate}
            className="text-xs font-bold text-white bg-[#00461e] hover:bg-[#00311a] px-4 py-1.5 rounded-lg"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  )
}

function Canvas({ initialNodes = [], initialEdges = [], isEditor: isEditorProp = false, initialViewport, initialCustomColors, onSave, onSaveDefault }: Props) {
  // Mobile: always read-only regardless of editor permission
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const isEditor = isEditorProp && !isMobile
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [editNode, setEditNode] = useState<Node | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showNewLabel, setShowNewLabel] = useState(false)
  const [editLabel, setEditLabel] = useState<Node | null>(null)
  const [newFrameAtPosition, setNewFrameAtPosition] = useState<{ x: number; y: number } | null>(null)
  const [showNewTable, setShowNewTable] = useState(false)
  const [newTableAtPosition, setNewTableAtPosition] = useState<{ x: number; y: number } | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [newCardAtPosition, setNewCardAtPosition] = useState<{ x: number; y: number } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const reactFlow = useReactFlow()
  const flowRef = useRef<HTMLDivElement>(null)

  // Custom color palette
  const customColorsRef = useRef<string[]>(initialCustomColors ?? [])
  const [customColors, setCustomColors] = useState<string[]>(initialCustomColors ?? [])
  const [colorPickerTarget, setColorPickerTarget] = useState<{
    targetId: string
    targetType: 'node' | 'edge'
    position: { x: number; y: number }
  } | null>(null)

  // Undo history
  const undoStack = useRef<{ nodes: Node[]; edges: Edge[] }[]>([])
  const lastSavedStateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null)
  const skipUndoPush = useRef(false)

  // Helper: serialize state to GAS payload
  const buildPayload = useCallback((n: Node[], e: Edge[]) => JSON.stringify({
    nodes: n.map(nd => ({ id: nd.id, type: nd.type, position: nd.position, data: nd.data, style: nd.style, zIndex: nd.zIndex, hidden: nd.hidden })),
    edges: e.map(ed => ({ id: ed.id, source: ed.source, target: ed.target, animated: ed.animated, sourceHandle: ed.sourceHandle, targetHandle: ed.targetHandle, data: ed.data })),
    viewport: reactFlow.getViewport(),
    customColors: customColorsRef.current,
  }), [reactFlow])

  // Auto-save debounced
  const triggerSave = useCallback((n: Node[], e: Edge[]) => {
    if (!isEditor) return
    // Track undo: push last committed state before overwriting
    if (!skipUndoPush.current && lastSavedStateRef.current) {
      undoStack.current = [...undoStack.current.slice(-49), lastSavedStateRef.current]
    }
    skipUndoPush.current = false
    lastSavedStateRef.current = { nodes: n, edges: e }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      try {
        if (onSave) {
          onSave(buildPayload(n, e))
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } else {
          setSaveStatus('idle')
        }
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    }, 1500)
  }, [isEditor, buildPayload, onSave])

  // Undo handler
  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const prev = undoStack.current[undoStack.current.length - 1]
    undoStack.current = undoStack.current.slice(0, -1)
    skipUndoPush.current = true
    lastSavedStateRef.current = prev
    setNodes(prev.nodes)
    setEdges(prev.edges)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      try {
        if (onSave) {
          onSave(buildPayload(prev.nodes, prev.edges))
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } else {
          setSaveStatus('idle')
        }
      } catch {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    }, 1500)
  }, [setNodes, setEdges, buildPayload, onSave])

  // Ctrl+Z undo
  useEffect(() => {
    if (!isEditor) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isEditor, handleUndo])

  // ── Color palette ─────────────────────────────────────────────────────────────
  // Keep ref in sync with state so buildPayload always reads the latest
  useEffect(() => { customColorsRef.current = customColors }, [customColors])

  // Auto-save palette when it changes (debounced)
  const isFirstColorRender = useRef(true)
  useEffect(() => {
    if (isFirstColorRender.current) { isFirstColorRender.current = false; return }
    if (!isEditor) return
    const timer = setTimeout(() => {
      setNodes(n => { setEdges(e => { try { onSave?.(buildPayload(n, e)) } catch {} return e }); return n })
    }, 800)
    return () => clearTimeout(timer)
  }, [customColors, isEditor, buildPayload, setNodes, setEdges, onSave])

  const handleAddCustomColor = useCallback((color: string) => {
    setCustomColors(prev => prev.includes(color) ? prev : [...prev, color])
  }, [])

  const handleDeleteCustomColor = useCallback((color: string) => {
    setCustomColors(prev => prev.filter(c => c !== color))
  }, [])

  const handleColorChange = useCallback((targetId: string, targetType: 'node' | 'edge', color: string | null) => {
    if (targetType === 'node') {
      setNodes(ns => {
        const updated = ns.map(n => {
          if (n.id !== targetId) return n
          const d = { ...(n.data as object) } as Record<string, unknown>
          if (color) d.color = color; else delete d.color
          return { ...n, data: d as unknown as Record<string, unknown> }
        })
        triggerSave(updated, edges)
        return updated
      })
    } else {
      setEdges(es => {
        const updated = es.map(e => {
          if (e.id !== targetId) return e
          const d = { ...(e.data as object || {}) } as Record<string, unknown>
          if (color) d.color = color; else delete d.color
          return { ...e, data: d as unknown as Record<string, unknown> }
        })
        setNodes(n => { triggerSave(n, updated); return n })
        return updated
      })
    }
    setColorPickerTarget(null)
  }, [setNodes, setEdges, edges, triggerSave])

  const handleOpenColorPicker = useCallback((nodeId: string, rect: DOMRect) => {
    setColorPickerTarget({
      targetId: nodeId,
      targetType: 'node',
      position: { x: rect.left, y: rect.bottom + 4 },
    })
  }, [])

  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    setTimeout(() => {
      setNodes(n => { triggerSave(n, edges); return n })
    }, 0)
  }, [onNodesChange, edges, triggerSave, setNodes])

  const handleEdgesChange: OnEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
    setTimeout(() => {
      setEdges(e => { setNodes(n => { triggerSave(n, e); return n }); return e })
    }, 0)
  }, [onEdgesChange, triggerSave, setEdges, setNodes])

  const onConnect = useCallback((conn: Connection) => {
    if (!isEditor) return
    setEdges(eds => {
      const newEdges = addEdge({ ...conn, id: `e-${conn.source}-${conn.target}` }, eds)
      setNodes(n => { triggerSave(n, newEdges); return n })
      return newEdges
    })
  }, [isEditor, setEdges, setNodes, triggerSave])

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    if (!isEditor) return
    setEdges(eds => {
      const newEdges = reconnectEdge(oldEdge, newConnection, eds)
      setNodes(n => { triggerSave(n, newEdges); return n })
      return newEdges
    })
  }, [isEditor, setEdges, setNodes, triggerSave])

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!isEditor) return
    if (node.type === 'label') { setEditLabel(node) }
    else if (node.type === 'frame') { /* inline title edit handled inside RoadmapFrameNode */ }
    else if (node.type === 'table') { /* inline cell edit handled inside RoadmapTableNode */ }
    else { setEditNode(node) }
  }, [isEditor])

  // ── Context Menu ─────────────────────────────────────────────────────────────
  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    if (!isEditor) return
    e.preventDefault()
    const flowPos = reactFlow.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setContextMenu({ x: e.clientX, y: e.clientY, flowX: flowPos.x, flowY: flowPos.y, nodeId: null })
  }, [isEditor, reactFlow])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    if (!isEditor) return
    e.preventDefault()
    const flowPos = reactFlow.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setContextMenu({ x: e.clientX, y: e.clientY, flowX: flowPos.x, flowY: flowPos.y, nodeId: node.id })
  }, [isEditor, reactFlow])

  const onEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    if (!isEditor) return
    e.preventDefault()
    const flowPos = reactFlow.screenToFlowPosition({ x: e.clientX, y: e.clientY })
    setContextMenu({ x: e.clientX, y: e.clientY, flowX: flowPos.x, flowY: flowPos.y, nodeId: null, edgeId: edge.id })
  }, [isEditor, reactFlow])

  const handleEdgeStyleChange = useCallback((edgeId: string, edgeStyle: string) => {
    setEdges(eds => {
      const updated = eds.map(e => e.id === edgeId
        ? { ...e, data: { ...(e.data as object || {}), edgeStyle } }
        : e
      )
      setNodes(n => { triggerSave(n, updated); return n })
      return updated
    })
    setContextMenu(null)
  }, [setEdges, setNodes, triggerSave])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // Close context menu on any click outside ReactFlow
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  // ── Label handlers ────────────────────────────────────────────────────────────
  const handleAddLabel = useCallback((text: string, fontSize: number) => {
    const viewport = reactFlow.getViewport()
    const id = `label-${Date.now()}`
    const newNode: Node = {
      id,
      type: 'label',
      position: { x: -viewport.x / viewport.zoom + 300, y: -viewport.y / viewport.zoom + 100 },
      data: { text, fontSize } as unknown as Record<string, unknown>,
      style: { width: Math.max(200, text.length * fontSize * 0.6), height: fontSize + 20 },
    }
    setNodes(ns => {
      const updated = [...ns, newNode]
      triggerSave(updated, edges)
      return updated
    })
    setShowNewLabel(false)
  }, [reactFlow, setNodes, edges, triggerSave])

  // ── Frame handlers ────────────────────────────────────────────────────────────
  const handleAddFrame = useCallback((pos?: { x: number; y: number }) => {
    const viewport = reactFlow.getViewport()
    const position = pos ?? {
      x: -viewport.x / viewport.zoom + 200,
      y: -viewport.y / viewport.zoom + 100,
    }
    const id = `frame-${Date.now()}`
    const newNode: Node = {
      id,
      type: 'frame',
      position,
      data: { title: 'Novo frame' } as unknown as Record<string, unknown>,
      style: { width: 500, height: 350 },
      zIndex: -1,
    }
    setNodes(ns => {
      const updated = [...ns, newNode]
      triggerSave(updated, edges)
      return updated
    })
    setNewFrameAtPosition(null)
  }, [reactFlow, setNodes, edges, triggerSave])

  // ── Table handlers ────────────────────────────────────────────────────────────
  const DEFAULT_TABLE_DATA: RoadmapTableData = {
    title: '',
    columns: [
      { header: 'Item', hasCheckbox: false },
      { header: 'Status', hasCheckbox: true },
    ],
    rows: [
      { id: 'r1', cells: [{ text: '' }, { text: '', checked: false }] },
      { id: 'r2', cells: [{ text: '' }, { text: '', checked: false }] },
      { id: 'r3', cells: [{ text: '' }, { text: '', checked: false }] },
    ],
  }

  const handleAddTable = useCallback((tableData: RoadmapTableData, pos?: { x: number; y: number }) => {
    const viewport = reactFlow.getViewport()
    const position = pos ?? {
      x: -viewport.x / viewport.zoom + 200,
      y: -viewport.y / viewport.zoom + 100,
    }
    const id = `table-${Date.now()}`
    const newNode: Node = {
      id,
      type: 'table',
      position,
      data: tableData as unknown as Record<string, unknown>,
      style: { width: 320, height: 160 },
    }
    setNodes(ns => {
      const updated = [...ns, newNode]
      triggerSave(updated, edges)
      return updated
    })
    setShowNewTable(false)
    setNewTableAtPosition(null)
  }, [reactFlow, setNodes, edges, triggerSave])

  const handleTableChange = useCallback((nodeId: string, data: RoadmapTableData) => {
    setNodes(ns => {
      const updated = ns.map(n =>
        n.id === nodeId
          ? { ...n, data: data as unknown as Record<string, unknown> }
          : n
      )
      triggerSave(updated, edges)
      return updated
    })
  }, [setNodes, edges, triggerSave])

  const handleFrameToggle = useCallback((frameId: string, currentNodes: Node[], setNodesFn: (updater: (ns: Node[]) => Node[]) => void) => {
    const frame = currentNodes.find(n => n.id === frameId)
    if (!frame) return
    const isMinimized = !!(frame.data as unknown as RoadmapFrameData).minimized

    if (!isMinimized) {
      // Minimizing
      const fw = (frame.measured?.width ?? (frame.style?.width as number) ?? 400)
      const fh = (frame.measured?.height ?? (frame.style?.height as number) ?? 300)
      const fx = frame.position.x
      const fy = frame.position.y

      const contained = currentNodes
        .filter(n => n.id !== frameId && n.type !== 'frame')
        .filter(n => n.position.x >= fx && n.position.x <= fx + fw &&
                     n.position.y >= fy && n.position.y <= fy + fh)
        .map(n => n.id)

      setNodesFn(ns => {
        const updated = ns.map(n => {
          if (n.id === frameId) {
            return {
              ...n,
              data: {
                ...(n.data as object),
                minimized: true,
                expandedHeight: fh,
                containedNodeIds: contained,
              } as unknown as Record<string, unknown>,
              style: { ...(n.style || {}), height: 48 },
            }
          }
          if (contained.includes(n.id)) {
            return { ...n, hidden: true }
          }
          return n
        })
        triggerSave(updated, edges)
        return updated
      })
    } else {
      // Maximizing
      const frameData = frame.data as unknown as RoadmapFrameData
      const restoreH = frameData.expandedHeight ?? 300
      const contained = frameData.containedNodeIds ?? []

      setNodesFn(ns => {
        const updated = ns.map(n => {
          if (n.id === frameId) {
            return {
              ...n,
              data: { ...(n.data as object), minimized: false } as unknown as Record<string, unknown>,
              style: { ...(n.style || {}), height: restoreH },
            }
          }
          if (contained.includes(n.id)) {
            return { ...n, hidden: false }
          }
          return n
        })
        triggerSave(updated, edges)
        return updated
      })
    }
  }, [edges, triggerSave])

  const handleFrameTitleChange = useCallback((frameId: string, title: string, _currentNodes: Node[], setNodesFn: (updater: (ns: Node[]) => Node[]) => void, titleSize?: number) => {
    setNodesFn(ns => {
      const updated = ns.map(n =>
        n.id === frameId
          ? { ...n, data: { ...(n.data as object), title, ...(titleSize != null ? { titleSize } : {}) } as unknown as Record<string, unknown> }
          : n
      )
      triggerSave(updated, edges)
      return updated
    })
  }, [edges, triggerSave])

  const handleContextAction = useCallback((action: string) => {
    if (!contextMenu) return
    setContextMenu(null)

    if (action === 'new-frame') {
      handleAddFrame({ x: contextMenu.flowX, y: contextMenu.flowY })
    } else if (action === 'new-table') {
      setNewTableAtPosition({ x: contextMenu.flowX, y: contextMenu.flowY })
      setShowNewTable(true)
    } else if (action === 'new-card') {
      setNewCardAtPosition({ x: contextMenu.flowX, y: contextMenu.flowY })
      setShowNew(true)
    } else if (action === 'new-label') {
      setShowNewLabel(true)
    } else if (action === 'edit' && contextMenu.nodeId) {
      const node = nodes.find(n => n.id === contextMenu.nodeId)
      if (!node) return
      if (node.type === 'label') setEditLabel(node)
      else setEditNode(node)
    } else if (action === 'duplicate' && contextMenu.nodeId) {
      const node = nodes.find(n => n.id === contextMenu.nodeId)
      if (!node) return
      const id = `${node.type}-${Date.now()}`
      const dup: Node = { ...node, id, position: { x: node.position.x + 30, y: node.position.y + 30 }, selected: false }
      setNodes(ns => {
        const updated = [...ns, dup]
        triggerSave(updated, edges)
        return updated
      })
    } else if (action === 'delete' && contextMenu.nodeId) {
      const nid = contextMenu.nodeId
      setNodes(ns => {
        const updated = ns.filter(n => n.id !== nid)
        setEdges(es => {
          const updatedEdges = es.filter(e => e.source !== nid && e.target !== nid)
          triggerSave(updated, updatedEdges)
          return updatedEdges
        })
        return updated
      })
    }
  }, [contextMenu, nodes, setNodes, setEdges, edges, triggerSave, handleAddFrame])

  const handleEditLabel = useCallback((text: string, fontSize: number) => {
    if (!editLabel) return
    setNodes(ns => {
      const updated = ns.map(n => n.id === editLabel.id ? { ...n, data: { text, fontSize } as unknown as Record<string, unknown> } : n)
      triggerSave(updated, edges)
      return updated
    })
    setEditLabel(null)
  }, [editLabel, setNodes, edges, triggerSave])

  const handleDeleteLabel = useCallback(() => {
    if (!editLabel) return
    setNodes(ns => {
      const updated = ns.filter(n => n.id !== editLabel.id)
      triggerSave(updated, edges)
      return updated
    })
    setEditLabel(null)
  }, [editLabel, setNodes, edges, triggerSave])

  // ── Card handlers ─────────────────────────────────────────────────────────────
  const handleAddCard = useCallback((data: RoadmapCardData) => {
    const pos = newCardAtPosition ?? (() => {
      const viewport = reactFlow.getViewport()
      return { x: -viewport.x / viewport.zoom + 400, y: -viewport.y / viewport.zoom + 200 }
    })()
    const id = `card-${Date.now()}`
    const newNode: Node = { id, type: 'card', position: pos, data, style: { width: 230 } }
    setNodes(ns => {
      const updated = [...ns, newNode]
      triggerSave(updated, edges)
      return updated
    })
    setShowNew(false)
    setNewCardAtPosition(null)
  }, [reactFlow, setNodes, edges, triggerSave, newCardAtPosition])

  const handleEditSave = useCallback((data: RoadmapCardData) => {
    if (!editNode) return
    setNodes(ns => {
      const updated = ns.map(n => n.id === editNode.id ? { ...n, data } : n)
      triggerSave(updated, edges)
      return updated
    })
    setEditNode(null)
  }, [editNode, setNodes, edges, triggerSave])

  const handleDelete = useCallback(() => {
    if (!editNode) return
    setNodes(ns => {
      const updated = ns.filter(n => n.id !== editNode.id)
      setEdges(es => {
        const updatedEdges = es.filter(e => e.source !== editNode.id && e.target !== editNode.id)
        triggerSave(updated, updatedEdges)
        return updatedEdges
      })
      return updated
    })
    setEditNode(null)
  }, [editNode, setNodes, setEdges, triggerSave])

  // ── Node Toolbar actions (via context) ────────────────────────────────────────
  const handleToolbarEdit = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id)
    if (!node) return
    if (node.type === 'label') setEditLabel(node)
    else if (node.type === 'frame') {
      // Frame title editing is handled inline via double-click on the header
      // No external modal needed — noop here
    }
    else setEditNode(node)
  }, [nodes])

  const handleToolbarDelete = useCallback((id: string) => {
    setNodes(ns => {
      const updated = ns.filter(n => n.id !== id)
      setEdges(es => {
        const updatedEdges = es.filter(e => e.source !== id && e.target !== id)
        triggerSave(updated, updatedEdges)
        return updatedEdges
      })
      return updated
    })
  }, [setNodes, setEdges, triggerSave])

  const handleStatusChange = useCallback((id: string, status: string) => {
    setNodes(ns => {
      const updated = ns.map(n => n.id === id ? { ...n, data: { ...(n.data as object), status } } : n)
      triggerSave(updated, edges)
      return updated
    })
  }, [setNodes, edges, triggerSave])

  // ── Item 5: Move frame with contained cards ───────────────────────────────
  const dragStart = useRef<{ id: string; x: number; y: number } | null>(null)

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'frame') {
      dragStart.current = { id: node.id, x: node.position.x, y: node.position.y }
    }
  }, [])

  const onNodeDrag = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type !== 'frame' || !dragStart.current || dragStart.current.id !== node.id) return
    const dx = node.position.x - dragStart.current.x
    const dy = node.position.y - dragStart.current.y
    dragStart.current = { id: node.id, x: node.position.x, y: node.position.y }

    const contained = ((node.data as unknown as RoadmapFrameData).containedNodeIds ?? [])
    if (contained.length === 0) return

    setNodes(ns => ns.map(n => {
      if (contained.includes(n.id)) {
        return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
      }
      return n
    }))
  }, [setNodes])

  // ── Item 3: Drag containment — assign cards to frames on drop ─────────────
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    dragStart.current = null
    if (node.type === 'frame') {
      // Frame drag ended — just save
      setNodes(ns => { triggerSave(ns, edges); return ns })
      return
    }
    if (node.type !== 'card' && node.type !== 'label') return

    const nx = node.position.x
    const ny = node.position.y

    setNodes(ns => {
      // Find which frame (if any) this card landed in
      let targetFrameId: string | null = null
      for (const f of ns) {
        if (f.type !== 'frame') continue
        const fd = f.data as unknown as RoadmapFrameData
        if (fd.minimized) continue
        const fx = f.position.x
        const fy = f.position.y
        const fw = (f.measured?.width ?? (f.style?.width as number) ?? 400)
        const fh = (f.measured?.height ?? (f.style?.height as number) ?? 300)
        if (nx >= fx && nx <= fx + fw && ny >= fy && ny <= fy + fh) {
          targetFrameId = f.id
          break
        }
      }

      const updated = ns.map(n => {
        if (n.type !== 'frame') return n
        const fd = n.data as unknown as RoadmapFrameData
        const ids = fd.containedNodeIds ?? []
        if (n.id === targetFrameId) {
          // Add card if not already there
          if (!ids.includes(node.id)) {
            return { ...n, data: { ...(n.data as object), containedNodeIds: [...ids, node.id] } as unknown as Record<string, unknown> }
          }
        } else {
          // Remove card from this frame if it was there
          if (ids.includes(node.id)) {
            return { ...n, data: { ...(n.data as object), containedNodeIds: ids.filter(i => i !== node.id) } as unknown as Record<string, unknown> }
          }
        }
        return n
      })
      triggerSave(updated, edges)
      return updated
    })
  }, [setNodes, edges, triggerSave])

  const roadmapActions = useMemo<RoadmapActions>(() => ({
    onEdit: handleToolbarEdit,
    onDelete: handleToolbarDelete,
    onStatusChange: handleStatusChange,
    onFrameToggle: handleFrameToggle,
    onFrameTitleChange: handleFrameTitleChange,
    onTableChange: handleTableChange,
    onOpenColorPicker: handleOpenColorPicker,
  }), [handleToolbarEdit, handleToolbarDelete, handleStatusChange, handleFrameToggle, handleFrameTitleChange, handleTableChange, handleOpenColorPicker])

  // ── Download PNG ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const el = document.querySelector('.react-flow') as HTMLElement
    if (!el) return
    toPng(el, {
      backgroundColor: '#FAFAFA',
      filter: (node) => {
        if (node instanceof Element) {
          if (node.classList.contains('react-flow__minimap')) return false
          if (node.classList.contains('react-flow__controls')) return false
          if (node.classList.contains('react-flow__panel') && node.classList.contains('top')) return false
        }
        return true
      },
    }).then(dataUrl => {
      const a = document.createElement('a')
      a.download = 'roadmap-mesa-banco.png'
      a.href = dataUrl
      a.click()
    }).catch(() => { /* silently fail */ })
  }, [])

  // ── Save as default layout ────────────────────────────────────────────────────
  const handleSaveDefault = useCallback(() => {
    const payload = buildPayload(nodes, edges)
    try {
      onSaveDefault?.(payload)
      onSave?.(payload)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [nodes, edges, buildPayload, onSave, onSaveDefault])

  const statusBg = useMemo(() => {
    if (saveStatus === 'saving') return 'bg-amber-100 text-amber-700'
    if (saveStatus === 'saved') return 'bg-emerald-100 text-emerald-700'
    if (saveStatus === 'error') return 'bg-red-100 text-red-700'
    return ''
  }, [saveStatus])

  return (
    <RoadmapActionsContext.Provider value={isEditor ? roadmapActions : null as unknown as RoadmapActions}>
      <div className="relative w-full" style={{ height: '100%' }} ref={flowRef}>
        {/* Toolbar */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
          {isEditor && (<>
            <button
              onClick={() => setSelectMode(m => !m)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-md border ${selectMode ? 'bg-[#1D9E75] text-white border-[#1D9E75]' : 'bg-white text-[#1A1A1A] border-gray-200 hover:bg-gray-100'}`}
              title={selectMode ? 'Modo seleção ativo — arraste para selecionar' : 'Clique para ativar seleção em área'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
              </svg>
              {selectMode ? 'Seleção' : 'Selecionar'}
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 bg-[#1A1A1A] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#333] transition-colors shadow-md"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo card
            </button>
            <button
              onClick={() => setShowNewLabel(true)}
              className="flex items-center gap-1.5 bg-white text-[#1A1A1A] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shadow-md border border-gray-200"
            >
              <span className="text-sm font-black">T</span>
              Texto
            </button>
            <button
              onClick={() => handleAddFrame()}
              className="flex items-center gap-1.5 bg-white text-[#1A1A1A] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shadow-md border border-gray-200"
              title="Adicionar frame container"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
              </svg>
              Frame
            </button>
            <button
              onClick={() => setShowNewTable(true)}
              className="flex items-center gap-1.5 bg-white text-[#1A1A1A] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shadow-md border border-gray-200"
              title="Adicionar tabela"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9h18M9 9v12" />
              </svg>
              Tabela
            </button>
          </>)}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 bg-white text-[#1A1A1A] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shadow-md border border-gray-200"
            title="Exportar canvas como PNG"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            PNG
          </button>
          {isEditor && (
            <button
              onClick={handleSaveDefault}
              className="flex items-center gap-1.5 bg-white text-[#1A1A1A] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors shadow-md border border-gray-200"
              title="Salvar posições atuais como layout padrão para todos"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Padrão
            </button>
          )}
          {saveStatus !== 'idle' && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusBg}`}>
              {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'saved' ? 'Salvo' : 'Erro ao salvar'}
            </span>
          )}
        </div>

        {/* Hint */}
        <div className="absolute top-3 right-14 z-10">
          <span className="text-[10px] text-gray-400">
            {isEditor
              ? (selectMode ? 'Drag to select multiple · Move group together · Click "Select" to exit' : 'Drag cards · Double click to edit · Right click for more options')
              : 'Scroll to zoom · Drag background to pan'}
          </span>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isEditor ? handleNodesChange : undefined}
          onEdgesChange={isEditor ? handleEdgesChange : undefined}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          onPaneContextMenu={isEditor ? onPaneContextMenu : undefined}
          onNodeContextMenu={isEditor ? onNodeContextMenu : undefined}
          onEdgeContextMenu={isEditor ? onEdgeContextMenu : undefined}
          onNodeDragStart={isEditor ? onNodeDragStart : undefined}
          onNodeDrag={isEditor ? onNodeDrag : undefined}
          onNodeDragStop={isEditor ? onNodeDragStop : undefined}
          onPaneClick={closeContextMenu}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={isEditor}
          nodesConnectable={isEditor}
          elementsSelectable={isEditor}
          edgesReconnectable={isEditor}
          selectionOnDrag={isEditor && selectMode}
          panOnDrag={isEditor && selectMode ? [1, 2] : true}
          selectionMode={SelectionMode.Partial}
          deleteKeyCode={isEditor ? ['Backspace', 'Delete'] : null}
          onReconnect={isEditor ? onReconnect : undefined}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          fitView={!initialViewport}
          fitViewOptions={{ padding: 0.3 }}
          defaultViewport={initialViewport}
          className="bg-[#FAFAFA]"
        >
          <Background gap={24} size={1} color="#e8e8e8" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(n) => {
              const s = (n.data as RoadmapCardData)?.status
              if (s === 'done') return '#00461e'
              if (s === 'in-progress') return '#00d700'
              if (s === 'planned') return '#1D9E75'
              return '#d1d5db'
            }}
            style={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
        </ReactFlow>

        {/* Context Menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            {contextMenu.edgeId ? (
              <>
                <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estilo da aresta</div>
                <button onClick={() => handleEdgeStyleChange(contextMenu.edgeId!, 'default')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="inline-block w-6 border-t border-[#b0c4b0]" style={{ borderWidth: 1.5 }} /> Normal
                </button>
                <button onClick={() => handleEdgeStyleChange(contextMenu.edgeId!, 'bold')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="inline-block w-6 border-t border-[#00461e]" style={{ borderWidth: 3 }} /> Negrito
                </button>
                <button onClick={() => handleEdgeStyleChange(contextMenu.edgeId!, 'dashed')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="inline-block w-6 border-t border-[#00461e] border-dashed" style={{ borderWidth: 1.5 }} /> Tracejada
                </button>
                <button onClick={() => handleEdgeStyleChange(contextMenu.edgeId!, 'dotted')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="inline-block w-6 border-t border-[#00461e] border-dotted" style={{ borderWidth: 1.5 }} /> Pontilhada
                </button>
                <button onClick={() => handleEdgeStyleChange(contextMenu.edgeId!, 'animated')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="inline-block w-6 border-t border-[#00461e] border-dashed" style={{ borderWidth: 1.5 }} /> Animada
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button onClick={() => {
                  setColorPickerTarget({ targetId: contextMenu.edgeId!, targetType: 'edge', position: { x: contextMenu.x + 172, y: contextMenu.y } })
                  setContextMenu(null)
                }} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full ring-1 ring-black/10 shrink-0" style={{ background: (edges.find(e => e.id === contextMenu.edgeId)?.data as { color?: string })?.color || '#00461e' }} />
                  Cor
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button onClick={() => {
                  const eid = contextMenu.edgeId!
                  setEdges(eds => {
                    const updated = eds.filter(e => e.id !== eid)
                    setNodes(n => { triggerSave(n, updated); return n })
                    return updated
                  })
                  setContextMenu(null)
                }} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2">
                  <span>✕</span> Excluir aresta
                </button>
              </>
            ) : contextMenu.nodeId ? (
              <>
                <button onClick={() => handleContextAction('edit')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span>✎</span> Editar
                </button>
                <button onClick={() => handleContextAction('duplicate')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span>⧉</span> Duplicar
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button onClick={() => handleContextAction('delete')} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2">
                  <span>✕</span> Excluir
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleContextAction('new-frame')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} /></svg>
                  Novo frame aqui
                </button>
                <button onClick={() => handleContextAction('new-table')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9h18M9 9v12" /></svg>
                  Nova tabela aqui
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button onClick={() => handleContextAction('new-card')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="font-bold">+</span> Novo card aqui
                </button>
                <button onClick={() => handleContextAction('new-label')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="font-black text-sm">T</span> Novo texto
                </button>
              </>
            )}
          </div>
        )}

        {/* Modals */}
        <RoadmapEditModal
          open={showNew}
          initial={null}
          onSave={handleAddCard}
          onClose={() => { setShowNew(false); setNewCardAtPosition(null) }}
        />
        <RoadmapEditModal
          open={!!editNode}
          initial={editNode ? (editNode.data as unknown as RoadmapCardData) : null}
          onSave={handleEditSave}
          onDelete={handleDelete}
          onClose={() => setEditNode(null)}
        />

        {/* Label modals */}
        <LabelModal
          open={showNewLabel}
          initial={null}
          onSave={handleAddLabel}
          onClose={() => setShowNewLabel(false)}
        />
        <LabelModal
          open={!!editLabel}
          initial={editLabel ? (editLabel.data as unknown as RoadmapLabelData) : null}
          onSave={handleEditLabel}
          onDelete={handleDeleteLabel}
          onClose={() => setEditLabel(null)}
        />

        {/* Table config modal */}
        <TableConfigModal
          open={showNewTable}
          atPosition={newTableAtPosition}
          onSave={handleAddTable}
          onClose={() => { setShowNewTable(false); setNewTableAtPosition(null) }}
        />

        {/* Color Picker */}
        {colorPickerTarget && (
          <ColorPicker
            value={
              colorPickerTarget.targetType === 'node'
                ? (nodes.find(n => n.id === colorPickerTarget.targetId)?.data as { color?: string })?.color
                : (edges.find(e => e.id === colorPickerTarget.targetId)?.data as { color?: string })?.color
            }
            customColors={customColors}
            position={colorPickerTarget.position}
            onSelect={color => handleColorChange(colorPickerTarget.targetId, colorPickerTarget.targetType, color)}
            onAddCustom={handleAddCustomColor}
            onDeleteCustom={handleDeleteCustomColor}
            onClose={() => setColorPickerTarget(null)}
          />
        )}
      </div>
    </RoadmapActionsContext.Provider>
  )
}

export default function RoadmapCanvasWrapper(props: Props) {
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactFlowProvider>
        <Canvas {...props} />
      </ReactFlowProvider>
    </div>
  )
}
