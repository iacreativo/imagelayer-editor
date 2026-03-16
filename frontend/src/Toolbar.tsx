import { useState, useMemo } from 'react'
import { categories, EditingGraphic, editingGraphics, SpatialPosition } from './data/editingGraphics'
import { useLayerStore, Layer } from './useLayerStore'

interface PlacedGraphic {
  graphicId: string
  position: SpatialPosition
  color?: string
  customText?: string
  instruction: string
}

interface ToolbarProps {
  onPlaceGraphic: (graphic: PlacedGraphic) => void
  placedGraphics: PlacedGraphic[]
  selectedGraphicId: string | null
  onSelectGraphic: (id: string | null) => void
}

export const Toolbar = ({ 
  onPlaceGraphic, 
  placedGraphics, 
  selectedGraphicId,
  onSelectGraphic 
}: ToolbarProps) => {
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const [search, setSearch] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTextField, setShowTextField] = useState(false)
  const [tempColor, setTempColor] = useState('#ffffff')
  const [tempText, setTempText] = useState('')

  const filteredGraphics = useMemo(() => {
    return editingGraphics.filter(g => 
      g.category === activeCategory &&
      (g.label.toLowerCase().includes(search.toLowerCase()) ||
       g.description.toLowerCase().includes(search.toLowerCase()))
    )
  }, [activeCategory, search])

  const handleGraphicClick = (graphic: EditingGraphic) => {
    if (selectedGraphicId === graphic.id) {
      onSelectGraphic(null)
      setShowColorPicker(false)
      setShowTextField(false)
    } else {
      onSelectGraphic(graphic.id)
      setShowColorPicker(graphic.hasColorPicker)
      setShowTextField(graphic.hasTextField)
      setTempColor(graphic.color)
      setTempText('')
    }
  }

  const handlePlace = (position: SpatialPosition) => {
    const graphic = editingGraphics.find(g => g.id === selectedGraphicId)
    if (!graphic) return

    const instruction = graphic.promptTemplate(position)
    const finalInstruction = tempText 
      ? `${instruction}. ${tempText}` 
      : instruction

    onPlaceGraphic({
      graphicId: graphic.id,
      position,
      color: graphic.hasColorPicker ? tempColor : undefined,
      customText: tempText || undefined,
      instruction: finalInstruction
    })

    onSelectGraphic(null)
    setShowColorPicker(false)
    setShowTextField(false)
  }

  const getGraphicById = (id: string) => editingGraphics.find(g => g.id === id)

  return (
    <div style={styles.container}>
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar herramientas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tabs}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              ...styles.tab,
              ...(activeCategory === cat ? styles.activeTab : {})
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {filteredGraphics.map(graphic => (
          <button
            key={graphic.id}
            onClick={() => handleGraphicClick(graphic)}
            style={{
              ...styles.item,
              ...(selectedGraphicId === graphic.id ? styles.selectedItem : {})
            }}
          >
            <span style={styles.icon}>{graphic.icon}</span>
            <span style={styles.label}>{graphic.label}</span>
          </button>
        ))}
      </div>

      {selectedGraphicId && (
        <div style={styles.positionSelector}>
          <p style={styles.positionTitle}>Click en canvas para colocar en:</p>
          <div style={styles.positionButtons}>
            {(['top', 'bottom', 'left', 'right', 'center', 'foreground', 'background'] as SpatialPosition[]).map(pos => (
              <button
                key={pos}
                onClick={() => handlePlace(pos)}
                style={styles.positionBtn}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {showColorPicker && selectedGraphicId && (
        <div style={styles.optionsPanel}>
          <label style={styles.optionLabel}>
            Color:
            <input
              type="color"
              value={tempColor}
              onChange={(e) => setTempColor(e.target.value)}
              style={styles.colorPicker}
            />
          </label>
        </div>
      )}

      {showTextField && selectedGraphicId && (
        <div style={styles.optionsPanel}>
          <label style={styles.optionLabel}>
            Texto adicional (opcional):
            <input
              type="text"
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              placeholder="Instrucciones extra..."
              style={styles.textInput}
            />
          </label>
        </div>
      )}

      {placedGraphics.length > 0 && (
        <div style={styles.placedList}>
          <h4 style={styles.placedTitle}>Elementos en canvas:</h4>
          {placedGraphics.map((pg, idx) => {
            const graphic = getGraphicById(pg.graphicId)
            return (
              <div key={idx} style={styles.placedItem}>
                <span>{graphic?.icon} {graphic?.label}</span>
                <span style={styles.placedInstruction}>
                  {pg.instruction.substring(0, 40)}...
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '280px',
    height: '100%',
    background: '#2a2a2a',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #444',
    overflow: 'hidden'
  },
  searchContainer: {
    padding: '10px',
    borderBottom: '1px solid #444'
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #555',
    background: '#333',
    color: '#fff',
    fontSize: '14px',
    outline: 'none'
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    borderBottom: '1px solid #444',
    gap: '2px',
    padding: '4px'
  },
  tab: {
    flex: '1 1 auto',
    padding: '8px 4px',
    background: 'transparent',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '11px',
    borderRadius: '4px',
    transition: 'all 0.2s'
  },
  activeTab: {
    background: '#4a9eff',
    color: '#fff'
  },
  grid: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px',
    alignContent: 'start'
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 8px',
    background: '#333',
    border: '2px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    gap: '4px'
  },
  selectedItem: {
    borderColor: '#4a9eff',
    background: '#3a3a4a'
  },
  icon: {
    fontSize: '24px'
  },
  label: {
    fontSize: '11px',
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 1.2
  },
  positionSelector: {
    padding: '10px',
    borderTop: '1px solid #444',
    background: '#222'
  },
  positionTitle: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#aaa'
  },
  positionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px'
  },
  positionBtn: {
    padding: '6px 10px',
    background: '#444',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '11px'
  },
  optionsPanel: {
    padding: '10px',
    borderTop: '1px solid #444',
    background: '#222'
  },
  optionLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    color: '#aaa'
  },
  colorPicker: {
    width: '100%',
    height: '32px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  textInput: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #555',
    background: '#333',
    color: '#fff',
    fontSize: '12px',
    outline: 'none'
  },
  placedList: {
    padding: '10px',
    borderTop: '1px solid #444',
    maxHeight: '150px',
    overflow: 'auto',
    background: '#222'
  },
  placedTitle: {
    margin: '0 0 8px 0',
    fontSize: '12px',
    color: '#aaa'
  },
  placedItem: {
    padding: '6px 8px',
    background: '#333',
    borderRadius: '4px',
    marginBottom: '4px',
    fontSize: '11px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  placedInstruction: {
    color: '#888',
    fontSize: '10px'
  }
}
