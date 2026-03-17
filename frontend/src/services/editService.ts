import axios from 'axios'
import { compileAnnotationsToPrompt, generateMaskFromAnnotations } from '../utils/annotationEngine'
import { Layer } from '../useLayerStore'
import { PlacedGraphic } from '../usePlacedGraphics'

interface EditResponse {
  resultImageBase64: string
  provider: string
  cost: number
}

interface LoadingState {
  isLoading: boolean
  prompt: string
  error: string | null
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const getBase64FromImageUrl = async (imageUrl: string): Promise<string> => {
  if (imageUrl.startsWith('data:')) {
    return imageUrl
  }

  if (imageUrl.startsWith('http')) {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  return imageUrl
}

export const canvasToBase64 = (canvas: HTMLCanvasElement, format: string = 'image/png'): string => {
  return canvas.toDataURL(format)
}

export const generatePrompt = (placedGraphics: PlacedGraphic[]): string => {
  return compileAnnotationsToPrompt(placedGraphics)
}

export const generateMask = (
  placedGraphics: PlacedGraphic[],
  imgW: number = 800,
  imgH: number = 600
): string => {
  return generateMaskFromAnnotations(placedGraphics, imgW, imgH)
}

export const sendToAI = async (
  layers: Layer[],
  placedGraphics: PlacedGraphic[],
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  setLoadingState: React.Dispatch<React.SetStateAction<LoadingState>>,
  clearPlacedGraphics: () => void,
  addLayer: (type: Layer['type'], imageDataUrl: string | null) => string,
  updateLayer: (id: string, updates: Partial<Layer>) => void
): Promise<void> => {
  setLoadingState({
    isLoading: true,
    prompt: '',
    error: null
  })

  try {
    const baseLayer = layers.find(l => l.type === 'base')
    
    if (!baseLayer?.imageDataUrl) {
      throw new Error('No base image found')
    }

    const prompt = generatePrompt(placedGraphics)
    
    if (!prompt.trim()) {
      throw new Error('No annotations to process')
    }

    const mask = generateMask(placedGraphics)

    let imageBase64: string

    if (canvasRef.current) {
      imageBase64 = canvasToBase64(canvasRef.current)
    } else {
      imageBase64 = await getBase64FromImageUrl(baseLayer.imageDataUrl)
    }

    setLoadingState(prev => ({ ...prev, prompt }))

    const response = await axios.post<EditResponse>(`${API_URL}/edit`, {
      imageBase64,
      prompt,
      maskBase64: mask || undefined
    })

    const { resultImageBase64, provider, cost } = response.data

    addLayer('ai_result', resultImageBase64)

    const currentLayers = document.querySelector('[data-layer-store]')
    
    const newAiLayerId = crypto.randomUUID()
    
    setTimeout(() => {
      const allLayers = document.querySelectorAll('[data-layer-id]')
      const lastAiLayer = Array.from(allLayers).find(
        el => el.getAttribute('data-layer-type') === 'ai_result'
      )
      
      if (lastAiLayer) {
        const id = lastAiLayer.getAttribute('data-layer-id')
        if (id) {
          updateLayer(id, { opacity: 0.85 })
        }
      }
    }, 100)

    clearPlacedGraphics()

    setLoadingState({
      isLoading: false,
      prompt: prompt,
      error: null
    })

    console.log(`AI edit completed using ${provider}, cost: ${cost}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Edit failed:', errorMessage)
    
    setLoadingState({
      isLoading: false,
      prompt: '',
      error: errorMessage
    })

    throw error
  }
}

export const sendSimpleEdit = async (
  imageBase64: string,
  prompt: string,
  maskBase64?: string
): Promise<EditResponse> => {
  const response = await axios.post<EditResponse>(`${API_URL}/edit`, {
    imageBase64,
    prompt,
    maskBase64
  })

  return response.data
}

export type { LoadingState, EditResponse }
