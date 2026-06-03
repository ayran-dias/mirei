import { useState, useEffect, Component, type ReactNode } from 'react'
import AnimatedHero from '../components/AnimatedHero'
import RoadmapCanvas from '../components/roadmap/RoadmapCanvas'
import type { Node, Edge } from '@xyflow/react'

// Error boundary to catch and display render crashes
class RoadmapErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace', color: '#dc2626', whiteSpace: 'pre-wrap' }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Roadmap Crash</h2>
          <p><b>{this.state.error.message}</b></p>
          <pre style={{ fontSize: 11, marginTop: 12, maxHeight: 300, overflow: 'auto', background: '#fef2f2', padding: 12, borderRadius: 8 }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

declare const google: { script: { run: { withSuccessHandler: (fn: (r: unknown) => void) => { withFailureHandler: (fn: (e: unknown) => void) => { getRoadmapData: () => void } }; getRoadmapData: () => void } } }

interface RoadmapResponse {
  isEditor: boolean
  email: string
  nodes: Node[]
  edges: Edge[]
  viewport?: { x: number; y: number; zoom: number }
  customColors?: string[]
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
    <div className="flex flex-col bg-[#FAFAFA]" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
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
        <RoadmapErrorBoundary>
          <div className="flex-1 min-h-0">
            <RoadmapCanvas
              initialNodes={data.nodes}
              initialEdges={data.edges}
              isEditor={data.isEditor}
              initialViewport={data.viewport}
              initialCustomColors={data.customColors}
            />
          </div>
        </RoadmapErrorBoundary>
      )}
    </div>
  )
}
