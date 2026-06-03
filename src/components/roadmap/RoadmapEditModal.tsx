import { useState, useEffect } from 'react'
import type { RoadmapCardData } from './RoadmapCardNode'

interface Props {
  open: boolean
  initial: RoadmapCardData | null  // null = new card
  onSave: (data: RoadmapCardData) => void
  onDelete?: () => void
  onClose: () => void
}

const EMPTY: RoadmapCardData = { title: '', description: '', status: 'backlog', category: 'feature', align: 'left' }

export default function RoadmapEditModal({ open, initial, onSave, onDelete, onClose }: Props) {
  const [form, setForm] = useState<RoadmapCardData>(initial || EMPTY)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { setForm(initial || EMPTY); setConfirmDelete(false) }, [initial, open])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  const set = (k: keyof RoadmapCardData, v: string) => setForm(f => ({ ...f, [k]: v }))
  const isNew = !initial
  const canSave = form.title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#1A1A1A] px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">{isNew ? 'Novo card' : 'Editar card'}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Título</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              placeholder="Nome da feature ou tarefa"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none"
              rows={3}
              placeholder="Breve descrição (opcional)"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alinhamento</label>
            <div className="mt-1 flex gap-1">
              {(['left', 'center', 'right'] as const).map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => set('align', a)}
                  title={a === 'left' ? 'Esquerda' : a === 'center' ? 'Centro' : 'Direita'}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg border transition-colors ${form.align === a || (!form.align && a === 'left') ? 'bg-[#00461e] border-[#00461e] text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    {a === 'left'   && <><line x1="3" y1="6"  x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></>}
                    {a === 'center' && <><line x1="3" y1="6"  x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>}
                    {a === 'right'  && <><line x1="3" y1="6"  x2="21" y2="6" /><line x1="9" y1="12" x2="21" y2="12" /><line x1="6" y1="18" x2="21" y2="18" /></>}
                  </svg>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]">
                <option value="backlog">Backlog</option>
                <option value="planned">Pendente</option>
                <option value="in-progress">Em andamento</option>
                <option value="done">Concluído</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Categoria</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]">
                <option value="feature">Feature</option>
                <option value="ajuste">Ajuste</option>
                <option value="nova-entrega">Nova Entrega</option>
                <option value="longo-prazo">Longo Prazo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            {!isNew && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Confirma?</span>
                  <button onClick={onDelete} className="text-xs font-bold text-red-600 hover:text-red-800">Sim, excluir</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 hover:text-red-600">Excluir card</button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">Cancelar</button>
            <button
              onClick={() => canSave && onSave(form)}
              disabled={!canSave}
              className="text-xs font-bold text-white bg-[#1D9E75] hover:bg-[#178a64] disabled:bg-gray-300 px-4 py-1.5 rounded-lg transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
