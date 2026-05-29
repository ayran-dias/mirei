import { createContext, useContext } from 'react'

export interface RoadmapActions {
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

export const RoadmapActionsContext = createContext<RoadmapActions | null>(null)
export const useRoadmapActions = () => useContext(RoadmapActionsContext)!
