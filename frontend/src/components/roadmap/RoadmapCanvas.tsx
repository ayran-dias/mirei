import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
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
import RoadmapEditModal from './RoadmapEditModal'
import { RoadmapActionsContext, type RoadmapActions } from './RoadmapActionsContext'

declare const google: { script: { run: { withSuccessHandler: (fn: (r: unknown) => void) => { withFailureHandler: (fn: (e: unknown) => void) => { saveRoadmapData: (json: string) => void } }; saveRoadmapData: (json: string) => void } } }

interface Props {
  initialNodes: Node[]
  initialEdges: Edge[]
  isEditor: boolean
}

const nodeTypes = { card: RoadmapCardNode, label: RoadmapLabelNode }

interface ContextMenuState {
  x: number
  y: number
  flowX: number
  flowY: number
  nodeId: string | null
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

function Canvas({ initialNodes, initialEdges, isEditor }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [editNode, setEditNode] = useState<Node | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showNewLabel, setShowNewLabel] = useState(false)
  const [editLabel, setEditLabel] = useState<Node | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [newCardAtPosition, setNewCardAtPosition] = useState<{ x: number; y: number } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const reactFlow = useReactFlow()
  const flowRef = useRef<HTMLDivElement>(null)

  // Auto-save debounced
  const triggerSave = useCallback((n: Node[], e: Edge[]) => {
    if (!isEditor) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(() => {
      const payload = JSON.stringify({
        nodes: n.map(nd => ({ id: nd.id, type: nd.type, position: nd.position, data: nd.data })),
        edges: e.map(ed => ({ id: ed.id, source: ed.source, target: ed.target, animated: ed.animated })),
      })
      try {
        google.script.run
          .withSuccessHandler(() => { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000) })
          .withFailureHandler(() => { setSaveStatus('error'); setTimeout(() => setSaveStatus('idle'), 3000) })
          .saveRoadmapData(payload)
      } catch { setSaveStatus('error') }
    }, 1500)
  }, [isEditor])

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

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!isEditor) return
    if (node.type === 'label') { setEditLabel(node) }
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

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  // Close context menu on any click outside ReactFlow
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  const handleContextAction = useCallback((action: string) => {
    if (!contextMenu) return
    setContextMenu(null)

    if (action === 'new-card') {
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
  }, [contextMenu, nodes, setNodes, setEdges, edges, triggerSave])

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
    const newNode: Node = { id, type: 'card', position: pos, data }
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

  const roadmapActions = useMemo<RoadmapActions>(() => ({
    onEdit: handleToolbarEdit,
    onDelete: handleToolbarDelete,
    onStatusChange: handleStatusChange,
  }), [handleToolbarEdit, handleToolbarDelete, handleStatusChange])

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

  const statusBg = useMemo(() => {
    if (saveStatus === 'saving') return 'bg-amber-100 text-amber-700'
    if (saveStatus === 'saved') return 'bg-emerald-100 text-emerald-700'
    if (saveStatus === 'error') return 'bg-red-100 text-red-700'
    return ''
  }, [saveStatus])

  return (
    <RoadmapActionsContext.Provider value={isEditor ? roadmapActions : null as unknown as RoadmapActions}>
      <div className="relative w-full" style={{ height: 'calc(100vh - 160px)' }} ref={flowRef}>
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
              ? (selectMode ? 'Arraste para selecionar vários · Mova o grupo junto · Clique "Seleção" para voltar ao modo normal' : 'Arraste cards · Duplo clique para editar · Botão direito para mais opções')
              : 'Scroll para zoom · Arraste o fundo para navegar'}
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
          onPaneClick={closeContextMenu}
          nodeTypes={nodeTypes}
          nodesDraggable={isEditor}
          nodesConnectable={isEditor}
          elementsSelectable={isEditor}
          selectionOnDrag={isEditor && selectMode}
          panOnDrag={isEditor && selectMode ? [1, 2] : true}
          selectionMode={SelectionMode.Partial}
          deleteKeyCode={isEditor ? 'Backspace' : null}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          fitView
          fitViewOptions={{ padding: 0.3 }}
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
            {contextMenu.nodeId ? (
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
      </div>
    </RoadmapActionsContext.Provider>
  )
}

export default function RoadmapCanvasWrapper(props: Props) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  )
}
