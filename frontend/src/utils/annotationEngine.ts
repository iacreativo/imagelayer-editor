import { PlacedGraphic } from '../usePlacedGraphics'

export type SpatialPosition = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'foreground' | 'background'

interface GridPosition {
  row: number
  col: number
  horizontal: 'left' | 'center' | 'right'
  vertical: 'top' | 'middle' | 'bottom'
}

export const toSpatialDescription = (x: number, y: number, imgW: number, imgH: number): SpatialPosition => {
  const col = x < imgW / 3 ? 0 : x < (imgW * 2) / 3 ? 1 : 2
  const row = y < imgH / 3 ? 0 : y < (imgH * 2) / 3 ? 1 : 2

  const positionMap: Record<string, SpatialPosition> = {
    '0-0': 'top-left',
    '1-0': 'top',
    '2-0': 'top-right',
    '0-1': 'left',
    '1-1': 'center',
    '2-1': 'right',
    '0-2': 'bottom-left',
    '1-2': 'bottom',
    '2-2': 'bottom-right',
  }

  const pos = positionMap[`${row}-${col}`]
  if (pos) return pos

  const horizontal = col === 0 ? 'left' : col === 2 ? 'right' : 'center'
  const vertical = row === 0 ? 'top' : row === 2 ? 'bottom' : 'center'
  
  if (horizontal === 'center' && vertical === 'center') return 'center'
  if (horizontal === 'center') return vertical
  if (vertical === 'center') return horizontal
  
  return 'center'
}

export const compileAnnotationsToPrompt = (annotations: PlacedGraphic[]): string => {
  if (annotations.length === 0) {
    return ''
  }

  const byPosition: Record<SpatialPosition, PlacedGraphic[]> = {
    'top': [],
    'bottom': [],
    'left': [],
    'right': [],
    'center': [],
    'top-left': [],
    'top-right': [],
    'bottom-left': [],
    'bottom-right': [],
    'foreground': [],
    'background': []
  }

  annotations.forEach(ann => {
    const spatialDesc = toSpatialDescription(ann.x, ann.y, 800, 600)
    if (byPosition[spatialDesc]) {
      byPosition[spatialDesc].push(ann)
    }
  })

  const promptParts: string[] = []

  const positionOrder: SpatialPosition[] = [
    'top-left', 'top', 'top-right',
    'left', 'center', 'right',
    'bottom-left', 'bottom', 'bottom-right',
    'foreground', 'background'
  ]

  positionOrder.forEach(pos => {
    const items = byPosition[pos]
    if (items.length === 0) return

    const spatialDesc = toSpatialDescription(items[0].x, items[0].y, 800, 600)
    
    if (items.length === 1) {
      promptParts.push(items[0].instruction)
    } else {
      const instructions = items.map(item => {
        const base = item.instruction.replace(/^(Add|Change|Replace|Move|Remove|Transform)\s+/i, '')
        return base.charAt(0).toLowerCase() + base.slice(1)
      })
      
      const lastTwo = instructions.slice(-2)
      if (lastTwo.length === 2) {
        promptParts.push(`${lastTwo[0]} and ${lastTwo[1]} at the ${spatialDesc}`)
      } else {
        promptParts.push(instructions.join(', '))
      }
    }
  })

  let combined = promptParts.join('. ')
  
  if (!combined.endsWith('.')) {
    combined += '.'
  }

  const keywords = ['Add', 'Replace', 'Change', 'Transform', 'Remove', 'Create', 'Enhance', 'Modify']
  const hasMainAction = keywords.some(kw => combined.toLowerCase().startsWith(kw.toLowerCase()))
  
  if (!hasMainAction) {
    combined = `Add the following modifications: ${combined}`
  }

  return combined
}

export const generateMaskFromAnnotations = (
  annotations: PlacedGraphic[],
  imgW: number,
  imgH: number,
  brushRadius: number = 50
): string => {
  const canvas = document.createElement('canvas')
  canvas.width = imgW
  canvas.height = imgH
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    return ''
  }

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, imgW, imgH)

  ctx.fillStyle = '#FFFFFF'
  ctx.globalAlpha = 1

  annotations.forEach(ann => {
    const centerX = ann.x + ann.width / 2
    const centerY = ann.y + ann.height / 2
    const radius = Math.max(ann.width, ann.height) / 2 + brushRadius
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
  })

  const dataUrl = canvas.toDataURL('image/png')
  return dataUrl
}

export const getAnnotationsByRegion = (
  annotations: PlacedGraphic[],
  imgW: number,
  imgH: number
): Record<string, PlacedGraphic[]> => {
  const regions: Record<string, PlacedGraphic[]> = {
    'top-left': [],
    'top-center': [],
    'top-right': [],
    'middle-left': [],
    'middle-center': [],
    'middle-right': [],
    'bottom-left': [],
    'bottom-center': [],
    'bottom-right': [],
    'foreground': [],
    'background': []
  }

  annotations.forEach(ann => {
    const cx = ann.x + ann.width / 2
    const cy = ann.y + ann.height / 2
    
    const col = cx < imgW / 3 ? 'left' : cx < (imgW * 2) / 3 ? 'center' : 'right'
    const row = cy < imgH / 3 ? 'top' : cy < (imgH * 2) / 3 ? 'middle' : 'bottom'
    
    const regionKey = `${row}-${col}` as keyof typeof regions
    if (regions[regionKey]) {
      regions[regionKey].push(ann)
    }
  })

  return regions
}

export const createBlurMask = (
  annotations: PlacedGraphic[],
  imgW: number,
  imgH: number,
  blurRadius: number = 30
): string => {
  const canvas = document.createElement('canvas')
  canvas.width = imgW
  canvas.height = imgH
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    return ''
  }

  const gradient = ctx.createRadialGradient(
    imgW / 2, imgH / 2, 0,
    imgW / 2, imgH / 2, Math.max(imgW, imgH) / 2
  )
  gradient.addColorStop(0, '#000000')
  gradient.addColorStop(1, '#FFFFFF')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, imgW, imgH)

  annotations.forEach(ann => {
    const centerX = ann.x + ann.width / 2
    const centerY = ann.y + ann.height / 2
    const radius = Math.max(ann.width, ann.height) / 2 + blurRadius
    
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  })

  return canvas.toDataURL('image/png')
}
