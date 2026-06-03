import RoadmapCanvas from './components/roadmap/RoadmapCanvas'
import type { Node, Edge } from '@xyflow/react'

const DEMO_NODES: Node[] = [
  // Frames
  { id: 'frame-q1', type: 'frame', position: { x: 0, y: 0 }, data: { title: 'Q1', titleSize: 20, containedNodeIds: ['card-1', 'card-2', 'card-3'] }, style: { width: 360, height: 560 }, zIndex: -1 },
  { id: 'frame-q2', type: 'frame', position: { x: 400, y: 0 }, data: { title: 'Q2', titleSize: 20, containedNodeIds: ['card-4', 'card-5', 'card-6'] }, style: { width: 360, height: 560 }, zIndex: -1 },
  { id: 'frame-q3', type: 'frame', position: { x: 800, y: 0 }, data: { title: 'Q3', titleSize: 20, color: '#7c3aed', containedNodeIds: ['card-7', 'card-8'] }, style: { width: 360, height: 400 }, zIndex: -1 },

  // Cards — Q1
  { id: 'card-1', type: 'card', position: { x: 20, y: 55 }, data: { title: 'User Authentication', description: 'OAuth 2.0 + JWT session management', status: 'done', category: 'feature' } },
  { id: 'card-2', type: 'card', position: { x: 20, y: 215 }, data: { title: 'Dashboard MVP', description: 'Core metrics and KPI overview', status: 'done', category: 'feature', color: '#1e3a8a' } },
  { id: 'card-3', type: 'card', position: { x: 20, y: 375 }, data: { title: 'Onboarding Flow', description: 'Guided setup for new users', status: 'done', category: 'nova-entrega' } },

  // Cards — Q2
  { id: 'card-4', type: 'card', position: { x: 420, y: 55 }, data: { title: 'Dark Mode', description: 'System-aware theme switching', status: 'in-progress', category: 'ajuste' } },
  { id: 'card-5', type: 'card', position: { x: 420, y: 215 }, data: { title: 'Export to PDF', description: 'One-click report generation', status: 'in-progress', category: 'feature' } },
  { id: 'card-6', type: 'card', position: { x: 420, y: 375 }, data: { title: 'API v2', description: 'REST + GraphQL endpoints', status: 'planned', category: 'feature', color: '#7c3aed' } },

  // Cards — Q3
  { id: 'card-7', type: 'card', position: { x: 820, y: 55 }, data: { title: 'Mobile App', description: 'iOS + Android with React Native', status: 'planned', category: 'feature' } },
  { id: 'card-8', type: 'card', position: { x: 820, y: 215 }, data: { title: 'AI Suggestions', description: 'GPT-powered content assist', status: 'planned', category: 'longo-prazo' } },

  // Labels
  { id: 'lbl-1', type: 'label', position: { x: -10, y: -70 }, data: { text: '2025 Roadmap', fontSize: 32, color: '#1a1a1a' }, style: { width: 320, height: 44 } },
  { id: 'lbl-2', type: 'label', position: { x: 1180, y: 60 }, data: { text: 'Backlog', fontSize: 18, color: '#6b7280' }, style: { width: 140, height: 30 } },

  // Standalone backlog card
  { id: 'card-9', type: 'card', position: { x: 1180, y: 100 }, data: { title: 'Performance Audit', description: 'Lighthouse score target ≥ 95', status: 'backlog', category: 'ajuste' } },
]

const DEMO_EDGES: Edge[] = [
  { id: 'e1', source: 'card-1', target: 'card-4', sourceHandle: 'right', targetHandle: 'left', data: { edgeStyle: 'default' } },
  { id: 'e2', source: 'card-5', target: 'card-7', sourceHandle: 'right', targetHandle: 'left', data: { edgeStyle: 'dashed' } },
  { id: 'e3', source: 'card-6', target: 'card-8', sourceHandle: 'right', targetHandle: 'left', data: { edgeStyle: 'animated', color: '#7c3aed' } },
]

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1a', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#c7ff3d', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em', fontFamily: 'Manrope, sans-serif' }}>mirei</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'Manrope, sans-serif' }}>interactive canvas demo · editor mode</span>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <RoadmapCanvas
          initialNodes={DEMO_NODES}
          initialEdges={DEMO_EDGES}
          isEditor={true}
          onSave={(json) => console.log('Save triggered', JSON.parse(json).nodes.length, 'nodes')}
          onSaveDefault={(json) => console.log('Default layout saved', JSON.parse(json).viewport)}
        />
      </div>
    </div>
  )
}
