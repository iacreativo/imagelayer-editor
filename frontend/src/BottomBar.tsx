import { useState, useRef, useEffect } from 'react'
import { Layer } from '../useLayerStore'
import { PlacedGraphic } from '../usePlacedGraphics'
import { sendToAI, generatePrompt } from '../services/editService'

interface BottomBarProps {
  layers: Layer[]
  placedGraphics: PlacedGraphic[]
  onUndo: () => void
  onExport: () => void
  onFlatten: () => void
  loadingState: {
    isLoading: boolean
    prompt: string
    error: string | null
  }
  onSendToAI: () => void
  canUndo: boolean
}

export const BottomBar = ({
  layers,
  placedGraphics,
  onUndo,
  onExport,
  onFlatten,
  loadingState,
  onSendToAI,
  canUndo
}: BottomBarProps) => {
  const [showPromptTooltip, setShowPromptTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  const compiledPrompt = generatePrompt(placedGraphics)

  const handleGenerateClick = (e: React.MouseEvent) => {
    if (compiledPrompt && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      })
      setShowPromptTooltip(true)
    }
  }

  useEffect(() => {
    const handleClickOutside = () => setShowPromptTooltip(false)
    if (showPromptTooltip) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showPromptTooltip])

  const buttons = [
    {
      id: 'undo',
      icon: '↩️',
      label: 'Deshacer',
      onClick: onUndo,
      disabled: !canUndo || loadingState.isLoading
    },
    {
      id: 'generate',
      icon: '⚡',
      label: 'Generar con AI',
      onClick: handleGenerateClick,
      disabled: placedGraphics.length === 0 || loadingState.isLoading,
      ref: buttonRef
    },
    {
      id: 'export',
      icon: '📥',
      label: 'Exportar PNG',
      onClick: onExport,
      disabled: loadingState.isLoading
    },
    {
      id: 'flatten',
      icon: '🗂️',
      label: 'Aplanar capas',
      onClick: onFlatten,
      disabled: loadingState.isLoading
    }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.buttonGroup}>
        {buttons.map(btn => (
          <button
            key={btn.id}
            ref={btn.ref as any}
            onClick={btn.onClick}
            disabled={btn.disabled}
            style={{
              ...styles.button,
              ...(btn.disabled ? styles.buttonDisabled : {})
            }}
          >
            <span style={styles.buttonIcon}>{btn.icon}</span>
            <span style={styles.buttonLabel}>{btn.label}</span>
          </button>
        ))}
      </div>

      {loadingState.isLoading && (
        <div style={styles.loadingIndicator}>
          <div style={styles.spinner}></div>
          <span>Procesando...</span>
        </div>
      )}

      {loadingState.error && (
        <div style={styles.errorIndicator}>
          <span>⚠️ {loadingState.error}</span>
        </div>
      )}

      {showPromptTooltip && compiledPrompt && (
        <div style={{
          ...styles.tooltip,
          left: tooltipPosition.x,
          top: tooltipPosition.y - 10
        }}>
          <div style={styles.tooltipHeader}>
            <strong>Prompt a enviar:</strong>
            <button 
              onClick={() => {
                setShowPromptTooltip(false)
                onSendToAI()
              }}
              style={styles.tooltipSendBtn}
            >
              Enviar →
            </button>
          </div>
          <p style={styles.tooltipText}>{compiledPrompt}</p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: '#16213e',
    borderTop: '1px solid #0f3460',
    position: 'relative'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: '#0f3460',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed'
  },
  buttonIcon: {
    fontSize: '16px'
  },
  buttonLabel: {
    fontWeight: 500
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#4ade80',
    fontSize: '13px'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #4ade80',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorIndicator: {
    color: '#ff6b6b',
    fontSize: '12px'
  },
  tooltip: {
    position: 'fixed',
    transform: 'translateX(-50%) translateY(-100%)',
    background: '#1a1a2e',
    border: '1px solid #0f3460',
    borderRadius: '8px',
    padding: '12px 16px',
    maxWidth: '400px',
    zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
  },
  tooltipHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#aaa'
  },
  tooltipSendBtn: {
    background: '#e94560',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600
  },
  tooltipText: {
    fontSize: '12px',
    color: '#ccc',
    margin: 0,
    lineHeight: 1.5,
    maxHeight: '150px',
    overflow: 'auto'
  }
}
