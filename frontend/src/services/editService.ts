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
