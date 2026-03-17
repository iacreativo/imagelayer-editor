import { useState, useCallback } from 'react'
import { useLayerStore } from './useLayerStore'

interface HeaderBarProps {
  onUploadImage: (base64: string) => void
}

export const HeaderBar = ({ onUploadImage }: HeaderBarProps) => {
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

  return (
    <div style={styles.container}>
      <div style={styles.left}>
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
        <label style={styles.uploadButton}>
          📁 Upload Image
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
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    color: '#fff',
    fontWeight: 600
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
