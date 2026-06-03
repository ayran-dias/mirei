import { useState, useEffect } from 'react'
import type { RoadmapCardData } from './RoadmapCardNode'

interface Props {
  open: boolean
  initial: RoadmapCardData | null
  onSave: (data: RoadmapCardData) => void
  onDelete?: () => void
  onClose: () => void
}

const EMPTY: RoadmapCardData = { title: '', description: '', status: 'backlog', category: 'feature' }

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
        <div className="bg-[#1A1A1A] px-5 py-3 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">{isNew ? 'New card' : 'Edit card'}</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} autoFocus
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]" placeholder="Feature or task name" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] resize-none" placeholder="Short description (optional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]">
                <option value="backlog">Backlog</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]">
                <option value="feature">Feature</option>
                <option value="ajuste">Improvement</option>
                <option value="nova-entrega">Delivery</option>
                <option value="longo-prazo">Long-term</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <div>
            {!isNew && onDelete && (confirmDelete
              ? <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Confirm?</span>
                  <button onClick={onDelete} className="text-xs font-bold text-red-600 hover:text-red-800">Delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              : <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 hover:text-red-600">Delete card</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">Cancel</button>
            <button onClick={() => canSave && onSave(form)} disabled={!canSave}
              className="text-xs font-bold text-white bg-[#1D9E75] hover:bg-[#178a64] disabled:bg-gray-300 px-4 py-1.5 rounded-lg transition-colors">Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
