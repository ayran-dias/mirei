import { useState } from 'react'

interface Props {
  onSearch: (doc: string) => void
  loading: boolean
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = input.replace(/[.\-\/\s"']/g, '').trim()
    if (cleaned) onSearch(cleaned)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center w-full">
      <div className="relative flex-1">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Digite o CNPJ ou CPF..."
          className="w-full pl-11 pr-4 py-3 rounded-full bg-white/15 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 focus:border-white/40 text-sm backdrop-blur-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="px-6 py-3 bg-[#00d700] text-[#00461e] rounded-full font-bold text-sm hover:bg-[#00f000] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        {loading ? 'Buscando...' : 'Buscar →'}
      </button>
    </form>
  )
}
