import { Layer } from '../useLayerStore'

interface AdjustmentsPanelProps {
  selectedLayer: Layer | null
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void
}

export const AdjustmentsPanel = ({ selectedLayer, onUpdateLayer }: AdjustmentsPanelProps) => {
  if (!selectedLayer || selectedLayer.type !== 'ai_result') {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyIcon}>🎨</span>
        <p style={styles.emptyText}>Selecciona una capa de IA para ajustar</p>
      </div>
    )
  }

  const adjustments = selectedLayer.adjustments || {
    brightness: 100,
    contrast: 100,
    saturate: 100,
    hueRotate: 0,
    blur: 0,
    sepia: 0
  }

  const updateAdjustment = (key: string, value: number) => {
    const newAdjustments = { ...adjustments, [key]: value }
    onUpdateLayer(selectedLayer.id, { adjustments: newAdjustments })
  }

  const sliders = [
    { key: 'brightness', label: 'Brillo', min: 0, max: 200, value: adjustments.brightness, unit: '%' },
    { key: 'contrast', label: 'Contraste', min: 0, max: 200, value: adjustments.contrast, unit: '%' },
    { key: 'saturate', label: 'Saturación', min: 0, max: 200, value: adjustments.saturate, unit: '%' },
    { key: 'hueRotate', label: 'Tono', min: -180, max: 180, value: adjustments.hueRotate, unit: '°' },
    { key: 'blur', label: 'Desenfoque', min: 0, max: 20, value: adjustments.blur, unit: 'px' },
    { key: 'sepia', label: 'Sepia', min: 0, max: 100, value: adjustments.sepia, unit: '%' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Ajustes</span>
        <span style={styles.layerName}>{selectedLayer.name}</span>
      </div>

      <div style={styles.content}>
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Filtros</h4>
          {sliders.map(slider => (
            <div key={slider.key} style={styles.sliderGroup}>
              <div style={styles.sliderHeader}>
                <span style={styles.sliderLabel}>{slider.label}</span>
                <span style={styles.sliderValue}>{slider.value}{slider.unit}</span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                value={slider.value}
                onChange={(e) => updateAdjustment(slider.key, Number(e.target.value))}
                style={styles.slider}
              />
            </div>
          ))}
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Blend Mode</h4>
          <select
            value={selectedLayer.blendMode}
            onChange={(e) => onUpdateLayer(selectedLayer.id, { blendMode: e.target.value as Layer['blendMode'] })}
            style={styles.select}
          >
            <option value="source-over">Normal</option>
            <option value="multiply">Multiplicar</option>
            <option value="screen">Pantalla</option>
            <option value="overlay">Superponer</option>
            <option value="darken">Oscurecer</option>
            <option value="lighten">Aclarar</option>
            <option value="color-dodge">Sobreexponer color</option>
            <option value="color-burn">Subexponer color</option>
          </select>
        </div>

        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Opacidad</h4>
          <div style={styles.opacityControl}>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(selectedLayer.opacity * 100)}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })}
              style={styles.slider}
            />
            <span style={styles.sliderValue}>{Math.round(selectedLayer.opacity * 100)}%</span>
          </div>
        </div>

        <div style={styles.presetButtons}>
          <button 
            style={styles.presetBtn}
            onClick={() => {
              onUpdateLayer(selectedLayer.id, { 
                adjustments: { brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, blur: 0, sepia: 0 }
              })
            }}
          >
            Restablecer
          </button>
          <button 
            style={{...styles.presetBtn, background: '#e94560'}}
            onClick={() => {
              onUpdateLayer(selectedLayer.id, { 
                adjustments: { brightness: 120, contrast: 110, saturate: 130, hueRotate: 0, blur: 0, sepia: 20 }
              })
            }}
          >
            Warm Vintage
          </button>
          <button 
            style={{...styles.presetBtn, background: '#4a9eff'}}
            onClick={() => {
              onUpdateLayer(selectedLayer.id, { 
                adjustments: { brightness: 90, contrast: 120, saturate: 80, hueRotate: 180, blur: 0, sepia: 0 }
              })
            }}
          >
            Cool B&W
          </button>
        </div>
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
  layerName: {
    fontSize: '11px',
    color: '#aaa',
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '12px'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '12px',
    color: '#aaa',
    marginBottom: '10px',
    fontWeight: 500
  },
  sliderGroup: {
    marginBottom: '12px'
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px'
  },
  sliderLabel: {
    fontSize: '11px',
    color: '#ccc'
  },
  sliderValue: {
    fontSize: '11px',
    color: '#e94560',
    minWidth: '40px',
    textAlign: 'right'
  },
  slider: {
    width: '100%',
    height: '4px',
    accentColor: '#e94560',
    cursor: 'pointer'
  },
  select: {
    width: '100%',
    padding: '8px',
    background: '#0f3460',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '12px'
  },
  opacityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  presetButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '16px'
  },
  presetBtn: {
    flex: 1,
    minWidth: '80px',
    padding: '8px 12px',
    background: '#0f3460',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '20px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '40px',
    marginBottom: '12px',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '13px',
    color: '#666'
  }
}
