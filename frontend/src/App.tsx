import { useState, useCallback, useRef, useEffect } from 'react'
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Rect, Transformer, Group, Text, Rect as KonvaRect, Line } from 'react-konva'
import { useLayerStore, Layer } from './useLayerStore'
import { PlacedGraphic } from './usePlacedGraphics'
import { usePlacedGraphics } from './usePlacedGraphics'
import Konva from 'konva'
import { Toolbar } from './Toolbar'
import { RightPanel } from './RightPanel'
import { BottomBar } from './BottomBar'
import { MiniToolbar, Tool } from './MiniToolbar'
import { HeaderBar } from './HeaderBar'
import { sendToAI, generatePrompt, generateMask, calculateAspectRatio, Resolution } from './services/editService'
import { editingGraphics, SpatialPosition } from './data/editingGraphics'
import { authService } from './services/authService'
import { projectService, ProjectData } from './services/projectService'
import { LoginScreen } from './LoginScreen'
import { ProjectList } from './ProjectList'

type AppView = 'login' | 'projects' | 'editor'

function App() {
  const [view, setView] = useState<AppView>('login')
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const { 
    layers, 
    setLayers,
    addLayer, 
    updateLayer,
    forceUpdateLayer,
    removeLayer, 
    reorderLayers, 
    flattenLayers,
    undo,
    clearHistory,
    setHistory,
    history
  } = useLayerStore()
  
  const { 
    placedGraphics, 
    setPlacedGraphics,
    addPlacedGraphic, 
    updatePlacedGraphic,
    removePlacedGraphic,
    clearPlacedGraphics
  } = usePlacedGraphics()
  
  const [selectedGraphicId, setSelectedGraphicId] = useState<string | null>(null)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [selectedResolution, setSelectedResolution] = useState<Resolution>('2k')
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    prompt: '',
    error: null as string | null
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (authService.isAuthenticated()) {
      setView('projects')
    }
  }, [])

  const handleLogin = () => {
    setView('projects')
  }

  const handleLogout = () => {
    authService.logout()
    setView('login')
    setCurrentProjectId(null)
  }

  const handleSelectProject = async (projectId: string) => {
    try {
      const project = await projectService.getProject(projectId)
      const data = project.data as ProjectData
      
      if (data.layers && data.layers.length > 0) {
        setLayers(data.layers.map((l: any) => ({
          ...l,
          createdAt: new Date(l.createdAt)
        })))
      }
      
      if (data.graphics) {
        setPlacedGraphics(data.graphics)
      }
      
      if (data.history) {
        setHistory(data.history.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        })))
      }
      
      if (data.canvasSettings) {
        setImageDimensions({ 
          width: data.canvasSettings.width, 
          height: data.canvasSettings.height 
        })
      }
      
      setCurrentProjectId(projectId)
      setView('editor')
      setLastSaved(new Date())
      setSaveStatus('saved')
    } catch (err) {
      console.error('Error loading project:', err)
    }
  }

  const saveProject = useCallback(async () => {
    if (!currentProjectId) return
    
    setSaveStatus('saving')
    try {
      const data: ProjectData = {
        layers: layers as any[],
        graphics: placedGraphics,
        history: history as any[],
        canvasSettings: { 
          width: imageDimensions?.width || 800, 
          height: imageDimensions?.height || 600, 
          zoom: 1, 
          position: { x: 0, y: 0 } 
        }
      }
      
      await projectService.updateProject(currentProjectId, { data })
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch (err) {
      console.error('Error saving project:', err)
      setSaveStatus('unsaved')
    }
  }, [currentProjectId, layers, placedGraphics, history, imageDimensions])

  useEffect(() => {
    if (view === 'editor' && currentProjectId) {
      setSaveStatus('unsaved')
    }
  }, [layers, placedGraphics, history])

  useEffect(() => {
    if (view !== 'editor' || !currentProjectId) return
    
    const interval = setInterval(() => {
      if (saveStatus === 'unsaved') {
        saveProject()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [view, currentProjectId, saveStatus, saveProject])

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
      
      const canvasWidth = imageDimensions?.width || 800
      const canvasHeight = imageDimensions?.height || 600
      
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      const imageBase64 = await flattenLayers(canvas)

      if (!imageBase64) {
        throw new Error('Could not rasterize canvas')
      }

      const maskBase64 = placedGraphics.length > 0 ? generateMask(placedGraphics, canvasWidth, canvasHeight) : undefined

      const aspectRatio = calculateAspectRatio(canvasWidth, canvasHeight)
      
      const data = await sendToAI(
        imageBase64, 
        prompt, 
        maskBase64,
        aspectRatio,
        selectedResolution
      )

      if (!data.resultImageBase64) {
        throw new Error('No image returned from AI')
      }

      addLayer('ai_result', data.resultImageBase64)
      clearPlacedGraphics()
      setLoadingState({ isLoading: false, prompt, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setLoadingState({ isLoading: false, prompt: '', error: errorMessage })
    }
  }, [layers, placedGraphics, addLayer, clearPlacedGraphics, selectedResolution, imageDimensions])

  const handleUndo = useCallback(() => {
    undo()
  }, [undo])

  const handleExport = useCallback(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    const dataUrl = await flattenLayers(canvas)
    
    const link = document.createElement('a')
    link.download = 'image-layers.png'
    link.href = dataUrl
    link.click()
  }, [flattenLayers])

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

  const handleUploadImage = useCallback((base64: string, width?: number, height?: number) => {
    const baseLayer = layers.find(l => l.type === 'base')
    if (baseLayer) {
      forceUpdateLayer(baseLayer.id, { 
        imageDataUrl: base64, 
        locked: false,
        width,
        height
      })
    } else {
      addLayer('base', base64)
      if (width && height) {
        setTimeout(() => {
          const newBaseLayer = layers.find(l => l.type === 'base')
          if (newBaseLayer) {
            forceUpdateLayer(newBaseLayer.id, { width, height })
          }
        }, 0)
      }
    }
    if (width && height) {
      setImageDimensions({ width, height })
    }
  }, [layers, forceUpdateLayer, addLayer])

  const handleBackToProjects = () => {
    if (saveStatus === 'unsaved') {
      if (confirm('¿Guardar cambios antes de salir?')) {
        saveProject().then(() => {
          setView('projects')
          setCurrentProjectId(null)
        })
      } else {
        setView('projects')
        setCurrentProjectId(null)
      }
    } else {
      setView('projects')
      setCurrentProjectId(null)
    }
  }

  if (view === 'login') {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (view === 'projects') {
    return (
      <ProjectList 
        onSelectProject={handleSelectProject} 
        onLogout={handleLogout} 
      />
    )
  }

  return (
    <div style={appStyles.container}>
      <HeaderBar 
        onUploadImage={handleUploadImage} 
        onBack={handleBackToProjects}
        saveStatus={saveStatus}
        lastSaved={lastSaved}
      />
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
            canvasWidth={imageDimensions?.width || 800}
            canvasHeight={imageDimensions?.height || 600}
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
            selectedResolution={selectedResolution}
            onResolutionChange={setSelectedResolution}
            canvasWidth={imageDimensions?.width}
            canvasHeight={imageDimensions?.height}
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
  canvasWidth?: number
  canvasHeight?: number
}

const EditorCanvas = ({ 
  layers, 
  selectedLayerId, 
  placedGraphics, 
  onUpdatePlacedGraphic, 
  onCanvasClick,
  canvasWidth = 800,
  canvasHeight = 600
}: EditorCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [scale, setScale] = useState(0.1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
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
        const containerWidth = containerRef.current.clientWidth
        const containerHeight = containerRef.current.clientHeight
        
        const scaleX = (containerWidth - 40) / canvasWidth
        const scaleY = (containerHeight - 40) / canvasHeight
        const initialScale = Math.min(scaleX, scaleY, 1)
        
        setSize({
          width: containerWidth,
          height: containerHeight
        })
        
        setScale(initialScale)
        setPosition({
          x: (containerWidth - canvasWidth * initialScale) / 2,
          y: (containerHeight - canvasHeight * initialScale) / 2
        })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [canvasWidth, canvasHeight])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        setIsPanning(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
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
    const clampedScale = Math.max(0.01, Math.min(10, newScale))

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

    if (isSpacePressed) {
      setIsPanning(true)
      return
    }

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
  }, [position, scale, onCanvasClick, activeTool, isSpacePressed])

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
        style={{ cursor: isSpacePressed || isPanning ? 'grab' : 'default' }}
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

        {showRulers && (
          <KonvaLayer>
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
          </KonvaLayer>
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
    img.onerror = () => console.log('URLImage error:', layer.name)
    img.src = src
  }, [src, layer.name])

  if (!image) {
    return (
      <Group>
        <KonvaRect x={0} y={0} width={layer.width || 800} height={layer.height || 600} fill="#333" />
        <Text x={(layer.width || 800) / 2} y={(layer.height || 600) / 2} text={`Loading: ${layer.name}`} fill="#888" fontSize={14} />
      </Group>
    )
  }

  const canvasWidth = layer.width || image.width || 800
  const canvasHeight = layer.height || image.height || 600
  const imgRatio = image.width / image.height
  const canvasRatio = canvasWidth / canvasHeight

  let drawWidth: number
  let drawHeight: number
  let offsetX = 0
  let offsetY = 0

  if (imgRatio > canvasRatio) {
    drawWidth = canvasWidth
    drawHeight = canvasWidth / imgRatio
    offsetY = (canvasHeight - drawHeight) / 2
  } else {
    drawHeight = canvasHeight
    drawWidth = canvasHeight * imgRatio
    offsetX = (canvasWidth - drawWidth) / 2
  }

  return (
    <KonvaImage 
      id={layer.id} 
      image={image} 
      x={offsetX} 
      y={offsetY} 
      width={drawWidth} 
      height={drawHeight} 
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
