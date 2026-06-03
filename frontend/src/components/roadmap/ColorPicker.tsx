import { useState } from 'react'

const PRESET_COLORS = [
  // Neutrals
  '#000000', '#1a1a1a', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6', '#ffffff',
  // Red/Pink
  '#7f1d1d', '#b91c1c', '#ef4444', '#fca5a5', '#fce7f3', '#db2777', '#f472b6', '#fbcfe8',
  // Purple/Blue
  '#4c1d95', '#7c3aed', '#a78bfa', '#ede9fe', '#1e3a8a', '#2563eb', '#60a5fa', '#dbeafe',
  // Yellow/Orange
  '#78350f', '#d97706', '#fbbf24', '#fef08a', '#fefce8', '#9a3412', '#ea580c', '#fed7aa',
  // Green
  '#00461e', '#1D9E75', '#34d399', '#6ee7b7', '#d1fae5', '#c7ff3d', '#84cc16', '#ecfccb',
]

export interface ColorPickerProps {
  value?: string
  customColors: string[]
  position: { x: number; y: number }
  onSelect: (color: string | null) => void
  onAddCustom: (color: string) => void
  onDeleteCustom: (color: string) => void
  onClose: () => void
}

function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s)
}

function normalizeHex(s: string): string {
  return s.startsWith('#') ? s : '#' + s
}

export default function ColorPicker({
  value, customColors, position, onSelect, onAddCustom, onDeleteCustom, onClose,
}: ColorPickerProps) {
  const [hexInput, setHexInput] = useState('')

  const normalized = normalizeHex(hexInput)
  const previewValid = isValidHex(normalized)

  const handleAdd = () => {
    if (!previewValid) return
    if (!customColors.includes(normalized)) onAddCustom(normalized)
    onSelect(normalized)
    setHexInput('')
  }

  // Keep picker on screen
  const left = Math.min(position.x, window.innerWidth - 244)
  const top = Math.min(position.y + 6, window.innerHeight - 380)

  return (
    <>
      {/* Backdrop — click anywhere outside to close */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
      />

      {/* Picker panel */}
      <div
        className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 p-3 select-none"
        style={{ left, top, width: 236, fontFamily: 'Manrope, sans-serif' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cor</span>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm leading-none"
            title="Fechar"
          >
            ×
          </button>
        </div>

        {/* Preset grid — 8 cols × 5 rows */}
        <div className="grid grid-cols-8 gap-[5px] mb-2.5">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onSelect(color)}
              title={color}
              style={{ background: color }}
              className={`w-[22px] h-[22px] rounded-[5px] transition-transform hover:scale-110 active:scale-95
                ${value?.toLowerCase() === color.toLowerCase()
                  ? 'ring-2 ring-offset-1 ring-[#1D9E75] scale-105'
                  : 'ring-1 ring-black/10'}`}
            />
          ))}
        </div>

        {/* Custom colors */}
        {customColors.length > 0 && (
          <div className="mb-2.5">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Personalizadas</p>
            <div className="flex flex-wrap gap-[5px]">
              {customColors.map(color => (
                <div key={color} className="relative group">
                  <button
                    onClick={() => onSelect(color)}
                    title={color}
                    style={{ background: color }}
                    className={`w-[22px] h-[22px] rounded-[5px] transition-transform hover:scale-110 active:scale-95
                      ${value?.toLowerCase() === color.toLowerCase()
                        ? 'ring-2 ring-offset-1 ring-[#1D9E75] scale-105'
                        : 'ring-1 ring-black/10'}`}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteCustom(color) }}
                    className="absolute -top-1 -right-1 w-[13px] h-[13px] bg-red-500 text-white rounded-full text-[9px] font-bold hidden group-hover:flex items-center justify-center leading-none hover:bg-red-600 transition-colors"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add custom */}
        <div className="border-t border-gray-100 pt-2.5">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Hex personalizado</p>
          <div className="flex items-center gap-1.5">
            <div
              className="w-[22px] h-[22px] rounded-[5px] ring-1 ring-black/10 shrink-0 transition-colors"
              style={{ background: previewValid ? normalized : '#f3f4f6' }}
            />
            <input
              value={hexInput}
              onChange={e => setHexInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="#1D9E75"
              className="flex-1 text-[11px] border border-gray-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-[#1D9E75] font-mono"
            />
            <button
              onClick={handleAdd}
              disabled={!previewValid}
              className="shrink-0 text-[11px] font-bold text-white bg-[#1D9E75] hover:bg-[#178a64] disabled:bg-gray-200 disabled:text-gray-400 px-2.5 py-1 rounded-md transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Reset */}
        {value && (
          <button
            onClick={() => { onSelect(null); onClose() }}
            className="mt-2 w-full text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md py-1 transition-colors"
          >
            Remover cor
          </button>
        )}
      </div>
    </>
  )
}
