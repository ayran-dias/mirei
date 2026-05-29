import { useState, useEffect } from 'react'
import AnimatedHero from '../components/AnimatedHero'
import RoadmapCanvas from '../components/roadmap/RoadmapCanvas'
import type { Node, Edge } from '@xyflow/react'

declare const google: { script: { run: { withSuccessHandler: (fn: (r: unknown) => void) => { withFailureHandler: (fn: (e: unknown) => void) => { getRoadmapData: () => void } }; getRoadmapData: () => void } } }

interface RoadmapResponse {
  isEditor: boolean
  email: string
  nodes: Node[]
  edges: Edge[]
}

export default function RoadmapMesaBanco() {
  const [data, setData] = useState<RoadmapResponse | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    try {
      google.script.run
        .withSuccessHandler((r: unknown) => setData(r as RoadmapResponse))
        .withFailureHandler(() => setError(true))
        .getRoadmapData()
    } catch {
      setError(true)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AnimatedHero className="px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#a5fa00] text-[11px] font-bold uppercase tracking-[0.15em] mb-2">Repositório · Planejamentos</p>
          <h1 className="text-white font-black text-3xl tracking-tight">Roadmap: Mesa Banco</h1>
          <p className="text-white/50 text-sm mt-2">Plano e andamento do projeto.</p>
          {data && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[11px] text-white/40">{data.email}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${data.isEditor ? 'bg-[#c7ff3d]/20 text-[#c7ff3d]' : 'bg-white/10 text-white/50'}`}>
                {data.isEditor ? 'Editor' : 'Apenas visualização'}
              </span>
            </div>
          )}
        </div>
      </AnimatedHero>

      {error && (
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-red-500 text-sm">Erro ao carregar roadmap. Recarregue a página.</p>
        </div>
      )}

      {!data && !error && (
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1D9E75]" />
          <p className="text-gray-400 text-sm mt-3">Carregando roadmap...</p>
        </div>
      )}

      {data && (
        <RoadmapCanvas
          initialNodes={data.nodes}
          initialEdges={data.edges}
          isEditor={data.isEditor}
        />
      )}
    </div>
  )
}
