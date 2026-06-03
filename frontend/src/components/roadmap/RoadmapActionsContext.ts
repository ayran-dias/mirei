import { createContext, useContext } from 'react'
import type { Node } from '@xyflow/react'

// Inline to avoid circular import (RoadmapTableNode imports from this file)
interface RoadmapTableDataRef {
  title?: string
  columns: { header: string; hasCheckbox: boolean; options?: string[] }[]
  rows: { id: string; cells: { text: string; checked?: boolean }[] }[]
  headerColor?: string
  headerFontColor?: string
  stripeColor?: string
  fontColor?: string
}

export interface RoadmapActions {
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  onFrameToggle: (frameId: string, nodes: Node[], setNodes: (updater: (ns: Node[]) => Node[]) => void) => void
  onFrameTitleChange: (frameId: string, title: string, nodes: Node[], setNodes: (updater: (ns: Node[]) => Node[]) => void, titleSize?: number) => void
  onTableChange?: (nodeId: string, data: RoadmapTableDataRef) => void
  onOpenColorPicker: (nodeId: string, rect: DOMRect, colorKey?: string) => void
  onUngroup?: (groupId: string) => void
}

export const RoadmapActionsContext = createContext<RoadmapActions | null>(null)
export const useRoadmapActions = () => useContext(RoadmapActionsContext)!
