import { useState, useCallback, useEffect, useRef } from 'react'

export type Tool = 'select' | 'brush' | 'rectangle' | 'zoom' | 'ruler'

interface MiniToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onToggleRulers: () => void
  showRulers: boolean
}

export const MiniToolbar = ({
  activeTool,
  onToolChange,
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleRulers,
  showRulers
}: MiniToolbarProps) => {
  const tools: { id: Tool; icon: string; label: string; shortcut: string }[] = [
    { id: 'select', icon: '🖱️', label: 'Selección', shortcut: 'V' },
    { id: 'brush', icon: '✏️', label: 'Pincel', shortcut: 'B' },
    { id: 'rectangle', icon: '📐', label: 'Rectángulo', shortcut: 'M' },
    { id: 'zoom', icon: '🔍', label: 'Zoom', shortcut: 'Z' },
    { id: 'ruler', icon: '📏', label: 'Reglas', shortcut: 'R' }
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      const key = e.key.toLowerCase()
      const tool = tools.find(t => t.shortcut.toLowerCase() === key)
      if (tool) {
        onToolChange(tool.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToolChange, tools])

  return (
    <div style={styles.container}>
      <div style={styles.toolGroup}>
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            style={{
              ...styles.toolButton,
              ...(activeTool === tool.id ? styles.toolButtonActive : {})
            }}
          >
            <span style={styles.toolIcon}>{tool.icon}</span>
            <span style={styles.shortcut}>{tool.shortcut}</span>
          </button>
        ))}
      </div>

      <div style={styles.divider} />

      <div style={styles.zoomGroup}>
        <button onClick={onZoomOut} title="Zoom out" style={styles.zoomButton}>
          −
        </button>
        <button onClick={onZoomReset} title="Reset zoom" style={styles.zoomValue}>
          {Math.round(scale * 100)}%
        </button>
        <button onClick={onZoomIn} title="Zoom in" style={styles.zoomButton}>
          +
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#0f3460',
    borderRadius: '8px'
  },
  toolGroup: {
    display: 'flex',
    gap: '4px'
  },
  toolButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    background: '#16213e',
    border: '2px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative'
  },
  toolButtonActive: {
    background: '#e94560',
    borderColor: '#ff6b8a'
  },
  toolIcon: {
    fontSize: '16px',
    lineHeight: 1
  },
  shortcut: {
    position: 'absolute',
    bottom: '2px',
    fontSize: '8px',
    color: 'rgba(255,255,255,0.5)'
  },
  divider: {
    width: '1px',
    height: '30px',
    background: '#1a1a2e'
  },
  zoomGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#16213e',
    borderRadius: '6px',
    padding: '2px'
  },
  zoomButton: {
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomValue: {
    minWidth: '50px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 500
  }
}
