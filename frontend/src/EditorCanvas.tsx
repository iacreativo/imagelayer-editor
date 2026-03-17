import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Rect, Transformer, Group, Text, Rect as KonvaRect } from 'react-konva'
import { useLayerStore, Layer } from './useLayerStore'
import { PlacedGraphic } from './usePlacedGraphics'
import Konva from 'konva'

interface EditorCanvasProps {
  placedGraphics: PlacedGraphic[]
  onUpdatePlacedGraphic: (id: string, updates: Partial<PlacedGraphic>) => void
  onCanvasClick?: (x: number, y: number) => void
}

export const EditorCanvas = ({ placedGraphics, onUpdatePlacedGraphic, onCanvasClick }: EditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [selectedGraphicId, setSelectedGraphicId] = useState<string | null>(null)

  const { layers } = useLayerStore()

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const sortedLayers = [...layers].sort((a, b) => {
    const typeOrder = (type: Layer['type']) => {
      if (type === 'base') return 0
      if (type === 'ai_result') return 1
      if (type === 'adjustment') return 2
      if (type === 'annotation') return 3
      return 4
    }
    return typeOrder(a.type) - typeOrder(b.type)
  })

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldScale = scale
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scaleBy = 1.1
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy
    const clampedScale = Math.max(0.1, Math.min(5, newScale))

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    }

    setScale(clampedScale)
    setPosition(newPos)
  }, [scale, position])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current
    if (!stage) return

    const clickedOnEmpty = e.target === stage || e.target.name() === 'background'
    if (clickedOnEmpty) {
      setIsPanning(true)
      const pos = stage.getPointerPosition()
      if (pos && onCanvasClick) {
        const realX = (pos.x - position.x) / scale
        const realY = (pos.y - position.y) / scale
        onCanvasClick(realX, realY)
      }
    }
  }, [position, scale, onCanvasClick])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return
    
    const stage = stageRef.current
    if (!stage) return

    const dx = e.evt.movementX
    const dy = e.evt.movementY

    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }))
  }, [isPanning])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleGraphicClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>, graphicId: string) => {
    e.cancelBubble = true
    setSelectedGraphicId(graphicId)
  }, [])

  const handleGraphicDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, graphicId: string) => {
    onUpdatePlacedGraphic(graphicId, {
      x: e.target.x(),
      y: e.target.y()
    })
  }, [onUpdatePlacedGraphic])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#1a1a1a' }}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        draggable={false}
      >
        <KonvaLayer>
          <Rect
            name="background"
            x={-10000}
            y={-10000}
            width={20000}
            height={20000}
            fill="transparent"
          />
        </KonvaLayer>
        
        {sortedLayers.map((layer) => (
          layer.imageDataUrl && (
            <KonvaLayer
              key={layer.id}
              opacity={layer.opacity}
              globalCompositeOperation={layer.blendMode}
            >
              <URLImage
                src={layer.imageDataUrl}
                layer={layer}
              />
            </KonvaLayer>
          )
        ))}

        <KonvaLayer>
          {placedGraphics.filter(g => g.visible).map((graphic) => (
            <Group
              key={graphic.id}
              id={graphic.id}
              x={graphic.x}
              y={graphic.y}
              draggable
              onClick={(e) => handleGraphicClick(e, graphic.id)}
              onTap={() => setSelectedGraphicId(graphic.id)}
              onDragEnd={(e) => handleGraphicDragEnd(e, graphic.id)}
            >
              <KonvaRect
                width={graphic.width}
                height={graphic.height}
                fill={graphic.color || '#4a9eff'}
                cornerRadius={8}
                opacity={0.8}
                shadowColor="black"
                shadowBlur={10}
                shadowOpacity={0.3}
              />
              <Text
                x={10}
                y={10}
                text={graphic.icon}
                fontSize={28}
              />
              <Text
                x={45}
                y={15}
                text={graphic.label}
                fontSize={12}
                fill="white"
                width={graphic.width - 55}
              />
              <Text
                x={10}
                y={45}
                text={graphic.instruction.length > 30 ? graphic.instruction.substring(0, 30) + '...' : graphic.instruction}
                fontSize={9}
                fill="rgba(255,255,255,0.7)"
                width={graphic.width - 20}
                wrap="none"
              />
            </Group>
          ))}
          
          {selectedGraphicId && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 50 || newBox.height < 30) {
                  return oldBox
                }
                return newBox
              }}
              onTransformEnd={() => {
                if (transformerRef.current && selectedGraphicId) {
                  const node = transformerRef.current.getStage()?.findOne(`#${selectedGraphicId}`)
                  if (node) {
                    onUpdatePlacedGraphic(selectedGraphicId, {
                      x: node.x(),
                      y: node.y(),
                      width: node.width() * node.scaleX(),
                      height: node.height() * node.scaleY()
                    })
                    node.scaleX(1)
                    node.scaleY(1)
                  }
                }
              }}
            />
          )}
        </KonvaLayer>
      </Stage>
    </div>
  )
}

interface URLImageProps {
  src: string
  layer: Layer
}

const URLImage = ({ src, layer }: URLImageProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImage(img)
    img.src = src
  }, [src])

  useEffect(() => {
    if (layer.type === 'annotation' && transformerRef.current) {
      const stage = transformerRef.current.getStage()
      if (stage) {
        const node = stage.findOne(`#${layer.id}`)
        if (node) {
          transformerRef.current.nodes([node])
          transformerRef.current.getLayer()?.batchDraw()
        }
      }
    }
  }, [layer.type, layer.id])

  if (!image) return null

  return (
    <>
      <KonvaImage
        id={layer.id}
        image={image}
        draggable={layer.type === 'annotation' && !layer.locked}
        x={0}
        y={0}
        width={800}
        height={600}
      />
      {layer.type === 'annotation' && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox
            }
            return newBox
          }}
        />
      )}
    </>
  )
}
