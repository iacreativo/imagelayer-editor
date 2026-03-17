import { useState, useCallback } from 'react'
import { SpatialPosition } from './data/editingGraphics'

export interface PlacedGraphic {
  id: string
  graphicId: string
  icon: string
  label: string
  position: SpatialPosition
  x: number
  y: number
  width: number
  height: number
  color?: string
  customText?: string
  instruction: string
  visible: boolean
}

export const usePlacedGraphics = () => {
  const [placedGraphics, setPlacedGraphics] = useState<PlacedGraphic[]>([])

  const addPlacedGraphic = useCallback((
    graphicId: string,
    icon: string,
    label: string,
    position: SpatialPosition,
    instruction: string,
    canvasWidth: number,
    canvasHeight: number,
    color?: string,
    customText?: string
  ) => {
    const positionCoords = getPositionCoords(position, canvasWidth, canvasHeight)
    
    const newGraphic: PlacedGraphic = {
      id: crypto.randomUUID(),
      graphicId,
      icon,
      label,
      position,
      x: positionCoords.x,
      y: positionCoords.y,
      width: 150,
      height: 80,
      color,
      customText,
      instruction,
      visible: true
    }

    setPlacedGraphics(prev => [...prev, newGraphic])
    return newGraphic.id
  }, [])

  const updatePlacedGraphic = useCallback((id: string, updates: Partial<PlacedGraphic>) => {
    setPlacedGraphics(prev => prev.map(g => 
      g.id === id ? { ...g, ...updates } : g
    ))
  }, [])

  const removePlacedGraphic = useCallback((id: string) => {
    setPlacedGraphics(prev => prev.filter(g => g.id !== id))
  }, [])

  const togglePlacedGraphicVisibility = useCallback((id: string) => {
    setPlacedGraphics(prev => prev.map(g => 
      g.id === id ? { ...g, visible: !g.visible } : g
    ))
  }, [])

  const clearPlacedGraphics = useCallback(() => {
    setPlacedGraphics([])
  }, [])

  return {
    placedGraphics,
    setPlacedGraphics,
    addPlacedGraphic,
    updatePlacedGraphic,
    removePlacedGraphic,
    togglePlacedGraphicVisibility,
    clearPlacedGraphics
  }
}

function getPositionCoords(position: SpatialPosition, width: number, height: number): { x: number; y: number } {
  const offset = 50
  
  switch (position) {
    case 'top':
      return { x: width / 2 - 75, y: offset }
    case 'bottom':
      return { x: width / 2 - 75, y: height - offset - 80 }
    case 'left':
      return { x: offset, y: height / 2 - 40 }
    case 'right':
      return { x: width - offset - 150, y: height / 2 - 40 }
    case 'center':
      return { x: width / 2 - 75, y: height / 2 - 40 }
    case 'top-left':
      return { x: offset, y: offset }
    case 'top-right':
      return { x: width - offset - 150, y: offset }
    case 'bottom-left':
      return { x: offset, y: height - offset - 80 }
    case 'bottom-right':
      return { x: width - offset - 150, y: height - offset - 80 }
    case 'foreground':
      return { x: width / 2 - 75, y: height - 150 }
    case 'background':
      return { x: width / 2 - 75, y: height / 2 - 40 }
    default:
      return { x: width / 2 - 75, y: height / 2 - 40 }
  }
}
