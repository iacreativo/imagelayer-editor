import { useState, useCallback, useRef } from 'react'

export interface LayerAdjustments {
  brightness: number
  contrast: number
  saturate: number
  hueRotate: number
  blur: number
  sepia: number
}

export interface Layer {
  id: string
  name: string
  type: 'base' | 'ai_result' | 'annotation' | 'adjustment'
  imageDataUrl: string | null
  opacity: number
  visible: boolean
  blendMode: 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn'
  locked: boolean
  createdAt: Date
  adjustments?: LayerAdjustments
}

export interface HistoryAction {
  id: string
  type: 'add_layer' | 'remove_layer' | 'update_layer' | 'reorder_layers' | 'ai_edit' | 'export'
  description: string
  timestamp: Date
  layerId?: string
  previousState?: Partial<Layer>
  newState?: Partial<Layer>
  layerIndex?: number
}

const defaultAdjustments: LayerAdjustments = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  blur: 0,
  sepia: 0
}

const createBaseLayer = (): Layer => ({
  id: 'base',
  name: 'Base Image',
  type: 'base',
  imageDataUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTFhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgZmlsbD0iIzY2NiI+VG9kbyBBcnRpY3VsbyBDYW52YXM8L3RleHQ+PC9zdmc+',
  opacity: 1,
  visible: true,
  blendMode: 'source-over',
  locked: true,
  createdAt: new Date(),
  adjustments: { ...defaultAdjustments }
})

export const useLayerStore = () => {
  const [layers, setLayers] = useState<Layer[]>([createBaseLayer()])
  const [history, setHistory] = useState<HistoryAction[]>([])
  const historyLimit = 20
  const previousStatesRef = useRef<Map<string, Layer[]>>(new Map())

  const addToHistory = useCallback((action: Omit<HistoryAction, 'id' | 'timestamp'>) => {
    const newAction: HistoryAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }
    setHistory(prev => {
      const updated = [...prev, newAction]
      return updated.slice(-historyLimit)
    })
  }, [])

  const addLayer = useCallback((type: Layer['type'], imageDataUrl: string | null = null) => {
    const newId = crypto.randomUUID()
    
    setLayers(prev => {
      previousStatesRef.current.set('add_layer', [...prev])
      
      const newLayer: Layer = {
        id: newId,
        name: `${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')} ${prev.length}`,
        type,
        imageDataUrl,
        opacity: type === 'ai_result' ? 0.85 : 1,
        visible: true,
        blendMode: 'source-over',
        locked: false,
        createdAt: new Date(),
        adjustments: { ...defaultAdjustments }
      }
      
      const updated = [...prev, newLayer]
      
      addToHistory({
        type: 'add_layer',
        description: `Añadir capa: ${newLayer.name}`,
        layerId: newLayer.id,
        newState: newLayer
      })
      
      return updated
    })

    return newId
  }, [addToHistory])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === id)
      if (!layer || layer.type === 'base') return prev
      
      previousStatesRef.current.set('remove_layer', [...prev])
      
      addToHistory({
        type: 'remove_layer',
        description: `Eliminar capa: ${layer.name}`,
        layerId: id,
        previousState: layer
      })
      
      return prev.filter(l => l.id !== id)
    })
  }, [addToHistory])

  const updateLayer = useCallback((id: string, updates: Partial<Omit<Layer, 'id' | 'type' | 'createdAt'>>) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === id)
      if (!layer) return prev
      
      previousStatesRef.current.set(`update_${id}`, [...prev])
      
      addToHistory({
        type: 'update_layer',
        description: `Actualizar capa: ${layer.name}`,
        layerId: id,
        previousState: layer,
        newState: { ...layer, ...updates }
      })

      return prev.map(l => 
        l.id === id && !l.locked ? { ...l, ...updates } : l
      )
    })
  }, [addToHistory])

  const forceUpdateLayer = useCallback((id: string, updates: Partial<Omit<Layer, 'id' | 'type' | 'createdAt'>>) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === id)
      if (!layer) return prev
      
      previousStatesRef.current.set(`update_${id}`, [...prev])
      
      addToHistory({
        type: 'update_layer',
        description: `Actualizar capa: ${layer.name}`,
        layerId: id,
        previousState: layer,
        newState: { ...layer, ...updates }
      })

      return prev.map(l => 
        l.id === id ? { ...l, ...updates } : l
      )
    })
  }, [addToHistory])

  const updateLayerOpacity = useCallback((id: string, opacity: number) => {
    updateLayer(id, { opacity: Math.max(0, Math.min(1, opacity)) })
  }, [updateLayer])

  const toggleVisibility = useCallback((id: string) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === id)
      if (!layer) return prev
      
      return prev.map(l => 
        l.id === id ? { ...l, visible: !l.visible } : l
      )
    })
  }, [])

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    setLayers(prev => {
      previousStatesRef.current.set('reorder', [...prev])
      
      const result = [...prev]
      const [removed] = result.splice(fromIndex, 1)
      result.splice(toIndex, 0, removed)
      
      addToHistory({
        type: 'reorder_layers',
        description: `Reordenar capas`,
        previousState: { opacity: fromIndex } as any,
        newState: { opacity: toIndex } as any
      })
      
      return result
    })
  }, [addToHistory])

  const undo = useCallback((actionId?: string) => {
    const targetAction = actionId 
      ? history.find(h => h.id === actionId)
      : history[history.length - 1]
    
    if (!targetAction) return

    setLayers(prev => {
      switch (targetAction.type) {
        case 'add_layer':
          if (targetAction.layerId) {
            return prev.filter(l => l.id !== targetAction.layerId)
          }
          break
        case 'remove_layer':
          if (targetAction.previousState) {
            return [...prev, targetAction.previousState as Layer]
          }
          break
        case 'update_layer':
          if (targetAction.layerId && targetAction.previousState) {
            return prev.map(l => 
              l.id === targetAction.layerId 
                ? { ...l, ...targetAction.previousState } 
                : l
            )
          }
          break
      }
      return prev
    })

    setHistory(prev => prev.filter(h => h.id !== targetAction.id))
  }, [history])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const flattenLayers = useCallback(async (canvas: HTMLCanvasElement): Promise<string> => {
    return new Promise((resolve) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve('')
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const visibleLayers = layers
        .filter(l => l.visible && l.imageDataUrl)
        .sort((a, b) => {
          const aIndex = layers.indexOf(a)
          const bIndex = layers.indexOf(b)
          return aIndex - bIndex
        })

      let loadedCount = 0

      if (visibleLayers.length === 0) {
        resolve(canvas.toDataURL())
        return
      }

      visibleLayers.forEach(layer => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.globalAlpha = layer.opacity
          ctx.globalCompositeOperation = layer.blendMode
          
          if (layer.adjustments) {
            const { brightness, contrast, saturate, hueRotate, blur, sepia } = layer.adjustments
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hueRotate}deg) blur(${blur}px) sepia(${sepia}%)`
          }
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          ctx.filter = 'none'
          
          loadedCount++
          if (loadedCount === visibleLayers.length) {
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = 'source-over'
            resolve(canvas.toDataURL())
          }
        }
        img.onerror = () => {
          loadedCount++
          if (loadedCount === visibleLayers.length) {
            ctx.globalAlpha = 1
            ctx.globalCompositeOperation = 'source-over'
            resolve(canvas.toDataURL())
          }
        }
        img.src = layer.imageDataUrl!
      })
    })
  }, [layers])

  return {
    layers,
    setLayers,
    history,
    setHistory,
    addLayer,
    removeLayer,
    updateLayer,
    forceUpdateLayer,
    updateLayerOpacity,
    toggleVisibility,
    reorderLayers,
    flattenLayers,
    undo,
    clearHistory
  }
}
