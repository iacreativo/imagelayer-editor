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

export type Resolution = '1k' | '2k' | '4k'

export const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5'] as const
export type AspectRatio = typeof ASPECT_RATIOS[number]

export function calculateAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height
  const ratios: Record<string, number> = {
    '1:1': 1, '16:9': 16/9, '9:16': 9/16,
    '4:3': 4/3, '3:4': 3/4, '3:2': 3/2,
    '2:3': 2/3, '5:4': 5/4, '4:5': 4/5
  }
  
  let closest: AspectRatio = '1:1'
  let minDiff = Math.abs(ratio - 1)
  
  for (const [key, value] of Object.entries(ratios)) {
    const diff = Math.abs(ratio - value)
    if (diff < minDiff) {
      minDiff = diff
      closest = key as AspectRatio
    }
  }
  
  return closest
}

export function getResolutionDimensions(resolution: Resolution, aspectRatio: AspectRatio): { width: number; height: number } {
  const basePixels: Record<Resolution, number> = {
    '1k': 1024,
    '2k': 2048,
    '4k': 4096
  }
  
  const pixels = basePixels[resolution]
  const [w, h] = aspectRatio.split(':').map(Number)
  const ratio = w / h
  
  let width: number, height: number
  
  if (ratio >= 1) {
    width = pixels
    height = Math.round(pixels / ratio)
  } else {
    height = pixels
    width = Math.round(pixels * ratio)
  }
  
  return { width, height }
}

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
  maskBase64?: string,
  aspectRatio?: string,
  resolution: Resolution = '1k'
): Promise<EditResponse> => {
  const response = await axios.post<EditResponse>(`${API_URL}/edit`, {
    imageBase64,
    prompt,
    maskBase64,
    aspectRatio,
    resolution
  })

  return response.data
}

export const sendSimpleEdit = async (
  imageBase64: string,
  prompt: string,
  maskBase64?: string,
  aspectRatio?: string,
  resolution: Resolution = '1k'
): Promise<EditResponse> => {
  const response = await axios.post<EditResponse>(`${API_URL}/edit`, {
    imageBase64,
    prompt,
    maskBase64,
    aspectRatio,
    resolution
  })

  return response.data
}

export type { LoadingState, EditResponse }
