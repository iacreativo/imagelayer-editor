import { useState, useCallback, useRef, useEffect } from 'react'
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Rect, Transformer, Group, Text, Rect as KonvaRect, Line, Circle } from 'react-konva'
import { useLayerStore, Layer } from './useLayerStore'
import { PlacedGraphic } from './usePlacedGraphics'
import { usePlacedGraphics } from './usePlacedGraphics'
import Konva from 'konva'
import { Toolbar } from './Toolbar'
import { RightPanel } from './RightPanel'
import { BottomBar } from './BottomBar'
import { MiniToolbar, Tool } from './MiniToolbar'
import { sendToAI, generatePrompt } from './services/editService'
import { editingGraphics, SpatialPosition } from './data/editingGraphics'

function App() {
  const { 
    layers, 
    addLayer, 
    updateLayer, 
    removeLayer, 
    reorderLayers, 
    flattenLayers,
    undo,
    clearHistory,
    history
  } = useLayerStore()
  
  const { 
    placedGraphics, 
    addPlacedGraphic, 
    updatePlacedGraphic,
    removePlacedGraphic,
    clearPlacedGraphics
  } = usePlacedGraphics()
  
  const [selectedGraphicId, setSelectedGraphicId] = useState<string | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    prompt: '',
    error: null as string | null
  })
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageContainerRef = useRef<HTMLDivElement>(null)

  const handlePlaceGraphic = useCallback((
    graphic: {
      graphicId: string
      position: SpatialPosition
      color?: string
      customText?: string
      instruction: string
    }
  ) => {
    const graphicDef = editingGraphics.find(g => g.id === graphic.graphicId)
    if (!graphicDef) return

    const canvasWidth = 800
    const canvasHeight = 600

    addPlacedGraphic(
      graphic.graphicId,
      graphicDef.icon,
      graphicDef.label,
      graphic.position,
      graphic.instruction,
      canvasWidth,
      canvasHeight,
      graphic.color,
      graphic.customText
    )
  }, [addPlacedGraphic])

  const handleCanvasClick = useCallback((x: number, y: number) => {
    console.log('Canvas clicked at:', x, y)
  }, [])

  const handleSendToAI = useCallback(async () => {
    if (placedGraphics.length === 0) {
      setLoadingState(prev => ({ ...prev, error: 'No annotations placed' }))
      return
    }

    try {
      setLoadingState(prev => ({ ...prev, error: null }))
      
      const prompt = generatePrompt(placedGraphics)
      setLoadingState({ isLoading: true, prompt, error: null })
      
      const baseLayer = layers.find(l => l.type === 'base')
      if (!baseLayer?.imageDataUrl) {
        throw new Error('No base image found')
      }

      const imageBase64 = baseLayer.imageDataUrl

      const response = await fetch('http://localhost:4000/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64.replace('data:image/png;base64,', '').replace('data:image/jpeg;base64,', ''),
          prompt
        })
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      addLayer('ai_result', data.resultImageBase64)
      clearPlacedGraphics()
      
      setLoadingState({ isLoading: false, prompt, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setLoadingState({ isLoading: false, prompt: '', error: errorMessage })
    }
  }, [layers, placedGraphics, addLayer, clearPlacedGraphics])

  const handleUndo = useCallback(() => {
    undo()
  }, [undo])

  const handleExport = useCallback(() => {
    console.log('Exporting...')
  }, [])

  const handleFlatten = useCallback(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    const dataUrl = await flattenLayers(canvas)
    
    const link = document.createElement('a')
    link.download = 'image-layers.png'
    link.href = dataUrl
    link.click()
  }, [flattenLayers])

  return (
    <div style={appStyles.container}>
      <div style={appStyles.main}>
        <div style={appStyles.leftPanel}>
          <Toolbar
            onPlaceGraphic={handlePlaceGraphic}
            placedGraphics={placedGraphics}
            selectedGraphicId={selectedGraphicId}
            onSelectGraphic={setSelectedGraphicId}
          />
        </div>
        
        <div style={appStyles.centerPanel}>
          <EditorCanvas
            layers={layers}
            selectedLayerId={selectedLayerId}
            placedGraphics={placedGraphics}
            onUpdatePlacedGraphic={updatePlacedGraphic}
            onCanvasClick={handleCanvasClick}
          />
          
          <BottomBar
            layers={layers}
            placedGraphics={placedGraphics}
            onUndo={handleUndo}
            onExport={handleExport}
            onFlatten={handleFlatten}
            loadingState={loadingState}
            onSendToAI={handleSendToAI}
            canUndo={history.length > 0}
          />
        </div>
        
        <div style={appStyles.rightPanel}>
          <RightPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayer={updateLayer}
            onRemoveLayer={removeLayer}
            onReorderLayers={reorderLayers}
            history={history}
            onUndo={(actionId) => undo(actionId)}
            onClearHistory={clearHistory}
          />
        </div>
      </div>
    </div>
  )
}

interface EditorCanvasProps {
  layers: Layer[]
  selectedLayerId: string | null
  placedGraphics: PlacedGraphic[]
  onUpdatePlacedGraphic: (id: string, updates: Partial<PlacedGraphic>) => void
  onCanvasClick?: (x: number, y: number) => void
}

const EditorCanvas = ({ layers, selectedLayerId, placedGraphics, onUpdatePlacedGraphic, onCanvasClick }: EditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [selectedGraphicId, setSelectedGraphicId] = useState<string | null>(null)
  
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [showRulers, setShowRulers] = useState(false)
  
  const [brushPoints, setBrushPoints] = useState<number[]>([])
  const [brushColor, setBrushColor] = useState('#ffffff')
  const [isDrawing, setIsDrawing] = useState(false)
  
  const [rectSelection, setRectSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null)

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
    if (activeTool === 'zoom') {
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
    }
  }, [scale, position, activeTool])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    const realX = (pointer.x - position.x) / scale
    const realY = (pointer.y - position.y) / scale

    if (activeTool === 'brush') {
      setIsDrawing(true)
      setBrushPoints([realX, realY])
      return
    }

    if (activeTool === 'rectangle') {
      setRectStart({ x: realX, y: realY })
      return
    }

    if (activeTool === 'select' || activeTool === 'ruler') {
      const clickedOnEmpty = e.target === stage || e.target.name() === 'background'
      if (clickedOnEmpty) {
        setIsPanning(true)
        if (onCanvasClick) {
          onCanvasClick(realX, realY)
        }
      }
    }
  }, [position, scale, onCanvasClick, activeTool])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return
    
    const realX = (pointer.x - position.x) / scale
    const realY = (pointer.y - position.y) / scale

    if (activeTool === 'brush' && isDrawing) {
      setBrushPoints(prev => [...prev, realX, realY])
      return
    }

    if (activeTool === 'rectangle' && rectStart) {
      setRectSelection({
        x: rectStart.x,
        y: rectStart.y,
        width: realX - rectStart.x,
        height: realY - rectStart.y
      })
      return
    }

    if (isPanning) {
      const dx = e.evt.movementX
      const dy = e.evt.movementY

      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }))
    }
  }, [isPanning, position, scale, activeTool, isDrawing, rectStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setIsDrawing(false)
    
    if (activeTool === 'brush' && brushPoints.length > 0) {
      console.log('Brush stroke:', brushPoints)
    }
    
    if (activeTool === 'rectangle' && rectSelection) {
      console.log('Rectangle selection:', rectSelection)
      setRectSelection(null)
      setRectStart(null)
    }
  }, [activeTool, brushPoints, rectSelection])

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(5, prev * 1.2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(0.1, prev / 1.2))
  }, [])

  const handleZoomReset = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleToggleRulers = useCallback(() => {
    setShowRulers(prev => !prev)
  }, [])

  const getLayerFilters = (layer: Layer) => {
    if (!layer.adjustments) return undefined
    const { brightness, contrast, saturate, hueRotate, blur, sepia } = layer.adjustments
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hueRotate}deg) blur(${blur}px) sepia(${sepia}%)`
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#1a1a2e', position: 'relative' }}>
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 100 
      }}>
        <MiniToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          scale={scale}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onToggleRulers={handleToggleRulers}
          showRulers={showRulers}
        />
      </div>

      {showRulers && (
        <div style={rulerStyles.container}>
          <div style={rulerStyles.horizontalRuler}>
            {[0, 100, 200, 300, 400, 500, 600, 700, 800].map(pos => (
              <div key={pos} style={{ ...rulerStyles.tick, left: pos }}>
                <span style={rulerStyles.tickLabel}>{pos}</span>
              </div>
            ))}
          </div>
          <div style={rulerStyles.verticalRuler}>
            {[0, 100, 200, 300, 400, 500, 600].map(pos => (
              <div key={pos} style={{ ...rulerStyles.tickV, top: pos }}>
                <span style={rulerStyles.tickLabelV}>{pos}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <Rect
          name="background"
          x={-10000}
          y={-10000}
          width={20000}
          height={20000}
          fill="transparent"
        />

        {showRulers && (
          <>
            <Line
              points={[0, 0, 800, 0]}
              stroke="#e94560"
              strokeWidth={1}
              dash={[5, 5]}
            />
            <Line
              points={[0, 0, 0, 600]}
              stroke="#e94560"
              strokeWidth={1}
              dash={[5, 5]}
            />
          </>
        )}
        
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
                filters={getLayerFilters(layer)}
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
              onClick={(e) => {
                e.cancelBubble = true
                setSelectedGraphicId(graphic.id)
              }}
              onTap={() => setSelectedGraphicId(graphic.id)}
              onDragEnd={(e) => {
                onUpdatePlacedGraphic(graphic.id, {
                  x: e.target.x(),
                  y: e.target.y()
                })
              }}
            >
              <KonvaRect
                width={graphic.width}
                height={graphic.height}
                fill={graphic.color || '#4a9eff'}
                cornerRadius={8}
                opacity={0.9}
                shadowColor="black"
                shadowBlur={10}
                shadowOpacity={0.4}
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

          {brushPoints.length > 0 && (
            <Line
              points={brushPoints}
              stroke={brushColor}
              strokeWidth={20}
              lineCap="round"
              lineJoin="round"
              opacity={0.5}
            />
          )}

          {rectSelection && (
            <Rect
              x={rectSelection.x}
              y={rectSelection.y}
              width={rectSelection.width}
              height={rectSelection.height}
              stroke="#e94560"
              strokeWidth={2}
              dash={[5, 5]}
              fill="rgba(233, 69, 96, 0.1)"
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
  filters?: string
}

const URLImage = ({ src, layer }: URLImageProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => setImage(img)
    img.src = src
  }, [src])

  if (!image) return null

  return (
    <KonvaImage
      id={layer.id}
      image={image}
      x={0}
      y={0}
      width={800}
      height={600}
    />
  )
}

const appStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    background: '#1a1a2e',
    overflow: 'hidden'
  },
  main: {
    display: 'grid',
    gridTemplateColumns: '240px 1fr 280px',
    flex: 1,
    overflow: 'hidden'
  },
  leftPanel: {
    background: '#16213e',
    borderRight: '1px solid #0f3460',
    overflow: 'hidden'
  },
  centerPanel: {
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a2e',
    overflow: 'hidden'
  },
  rightPanel: {
    background: '#16213e',
    borderLeft: '1px solid #0f3460',
    overflow: 'hidden'
  }
}

const rulerStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 50
  },
  horizontalRuler: {
    position: 'absolute',
    top: 0,
    left: '30px',
    right: 0,
    height: '20px',
    background: '#0f3460',
    borderBottom: '1px solid #e94560'
  },
  verticalRuler: {
    position: 'absolute',
    top: '30px',
    left: 0,
    bottom: 0,
    width: '20px',
    background: '#0f3460',
    borderRight: '1px solid #e94560'
  },
  tick: {
    position: 'absolute',
    top: 0,
    height: '10px',
    width: '1px',
    background: '#e94560'
  },
  tickV: {
    position: 'absolute',
    left: 0,
    width: '10px',
    height: '1px',
    background: '#e94560'
  },
  tickLabel: {
    position: 'absolute',
    top: '2px',
    fontSize: '8px',
    color: '#aaa',
    transform: 'translateX(-50%)'
  },
  tickLabelV: {
    position: 'absolute',
    left: '2px',
    fontSize: '8px',
    color: '#aaa',
    transform: 'translateY(-50%)'
  }
}

export default App
