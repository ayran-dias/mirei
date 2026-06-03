import { createContext, useContext } from 'react'
import type { Node } from '@xyflow/react'
import type { RoadmapTableData } from './RoadmapTableNode'

export interface RoadmapActions {
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  onFrameToggle: (frameId: string, nodes: Node[], setNodes: (updater: (ns: Node[]) => Node[]) => void) => void
  onFrameTitleChange: (frameId: string, title: string, nodes: Node[], setNodes: (updater: (ns: Node[]) => Node[]) => void, titleSize?: number) => void
  onTableChange?: (nodeId: string, data: RoadmapTableData) => void
  onOpenColorPicker: (nodeId: string, rect: DOMRect, colorKey?: string) => void
  onUngroup?: (groupId: string) => void
  onZIndexChange?: (nodeId: string, dir: 'front' | 'back' | 'forward' | 'backward') => void
}

export const RoadmapActionsContext = createContext<RoadmapActions | null>(null)
export const useRoadmapActions = () => useContext(RoadmapActionsContext)!
