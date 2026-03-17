import { Layer } from './useLayerStore'

interface LayerPanelProps {
  layers: Layer[]
  selectedLayerId: string | null
  onSelectLayer: (id: string) => void
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void
  onRemoveLayer: (id: string) => void
  onReorderLayers: (fromIndex: number, toIndex: number) => void
}

export const LayerPanel = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onRemoveLayer,
  onReorderLayers
}: LayerPanelProps) => {
  const sortedLayers = [...layers].reverse()

  const blendModes = [
    'source-over', 'multiply', 'screen', 'overlay', 
    'darken', 'lighten', 'color-dodge', 'color-burn'
  ]

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
    const reversedFrom = layers.length - 1 - fromIndex
    const reversedTo = layers.length - 1 - toIndex
    if (fromIndex !== toIndex) {
      onReorderLayers(reversedFrom, reversedTo)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Capas</span>
        <span style={styles.layerCount}>{layers.length}</span>
      </div>
      
      <div style={styles.layerList}>
        {sortedLayers.map((layer, idx) => {
          const realIndex = layers.length - 1 - idx
          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, realIndex)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, realIndex)}
              onClick={() => onSelectLayer(layer.id)}
              style={{
                ...styles.layerItem,
                ...(selectedLayerId === layer.id ? styles.layerItemSelected : {})
              }}
            >
              <div style={styles.layerThumbnail}>
                {layer.imageDataUrl ? (
                  <img src={layer.imageDataUrl} alt="" style={styles.thumbnailImg} />
                ) : (
                  <div style={styles.thumbnailPlaceholder}>
                    {layer.type === 'base' && '🖼️'}
                    {layer.type === 'ai_result' && '🤖'}
                    {layer.type === 'annotation' && '📝'}
                    {layer.type === 'adjustment' && '⚙️'}
                  </div>
                )}
              </div>

              <div style={styles.layerInfo}>
                <input
                  type="text"
                  value={layer.name}
                  onChange={(e) => onUpdateLayer(layer.id, { name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  style={styles.layerNameInput}
                  disabled={layer.locked}
                />
                
                <div style={styles.layerControls}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(layer.opacity * 100)}
                    onChange={(e) => onUpdateLayer(layer.id, { opacity: Number(e.target.value) / 100 })}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.opacitySlider}
                    disabled={layer.locked}
                  />
                  <span style={styles.opacityValue}>{Math.round(layer.opacity * 100)}%</span>
                </div>

                <div style={styles.layerActions}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateLayer(layer.id, { visible: !layer.visible })
                    }}
                    style={{
                      ...styles.iconButton,
                      color: layer.visible ? '#4ade80' : '#666'
                    }}
                    disabled={layer.locked}
                  >
                    {layer.visible ? '👁️' : '👁️‍🗨️'}
                  </button>

                  <select
                    value={layer.blendMode}
                    onChange={(e) => onUpdateLayer(layer.id, { blendMode: e.target.value as Layer['blendMode'] })}
                    onClick={(e) => e.stopPropagation()}
                    style={styles.blendSelect}
                    disabled={layer.locked}
                  >
                    {blendModes.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>

                  {!layer.locked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveLayer(layer.id)
                      }}
                      style={styles.deleteButton}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #0f3460'
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#fff'
  },
  layerCount: {
    background: '#e94560',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 600
  },
  layerList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px'
  },
  layerItem: {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    background: '#0f3460',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s'
  },
  layerItemSelected: {
    borderColor: '#e94560'
  },
  layerThumbnail: {
    width: '48px',
    height: '48px',
    borderRadius: '6px',
    overflow: 'hidden',
    background: '#1a1a2e',
    flexShrink: 0
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px'
  },
  layerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0
  },
  layerNameInput: {
    background: '#1a1a2e',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    color: '#fff',
    fontSize: '12px',
    width: '100%'
  },
  layerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  opacitySlider: {
    flex: 1,
    height: '4px',
    accentColor: '#e94560'
  },
  opacityValue: {
    fontSize: '10px',
    color: '#aaa',
    minWidth: '32px',
    textAlign: 'right'
  },
  layerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px'
  },
  blendSelect: {
    flex: 1,
    background: '#1a1a2e',
    border: 'none',
    borderRadius: '4px',
    padding: '4px',
    color: '#fff',
    fontSize: '10px'
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px',
    color: '#ff6b6b'
  }
}
