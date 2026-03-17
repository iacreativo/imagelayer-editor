import { useState, useCallback } from 'react'
import { useLayerStore } from './useLayerStore'

interface HeaderBarProps {
  onUploadImage: (base64: string) => void
  onBack?: () => void
  saveStatus?: 'saved' | 'saving' | 'unsaved'
  lastSaved?: Date | null
}

export const HeaderBar = ({ onUploadImage, onBack, saveStatus, lastSaved }: HeaderBarProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const { layers } = useLayerStore()

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      onUploadImage(base64)
    }
    reader.readAsDataURL(file)
  }, [onUploadImage])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const getSaveStatusText = () => {
    if (saveStatus === 'saving') return 'Guardando...'
    if (saveStatus === 'unsaved') return 'Sin guardar'
    if (lastSaved) {
      return `Guardado ${lastSaved.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    }
    return 'Guardado'
  }

  const getSaveStatusColor = () => {
    if (saveStatus === 'saving') return '#f59e0b'
    if (saveStatus === 'unsaved') return '#e94560'
    return '#4ade80'
  }

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        {onBack && (
          <button onClick={onBack} style={styles.backButton}>
            ← Proyectos
          </button>
        )}
        <h1 style={styles.title}>Image Layer Editor</h1>
      </div>

      <div style={styles.center}>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            ...styles.dropZone,
            ...(isDragging ? styles.dropZoneActive : {})
          }}
        >
          {isDragging ? 'Drop image here' : 'Drag & drop image'}
        </div>
      </div>

      <div style={styles.right}>
        {saveStatus && (
          <span style={{ ...styles.saveStatus, color: getSaveStatusColor() }}>
            {getSaveStatusText()}
          </span>
        )}
        <label style={styles.uploadButton}>
          📁 Subir Imagen
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: '#16213e',
    borderBottom: '1px solid #0f3460',
    height: '50px'
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  backButton: {
    padding: '8px 14px',
    background: 'transparent',
    border: '1px solid #0f3460',
    borderRadius: '6px',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    color: '#fff',
    fontWeight: 600
  },
  saveStatus: {
    fontSize: '12px',
    fontWeight: 500
  },
  center: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 20px'
  },
  dropZone: {
    padding: '6px 16px',
    background: '#0f3460',
    border: '2px dashed #333',
    borderRadius: '8px',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  dropZoneActive: {
    borderColor: '#e94560',
    background: '#1a1a2e',
    color: '#e94560'
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  uploadButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: '#e94560',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500
  }
}
