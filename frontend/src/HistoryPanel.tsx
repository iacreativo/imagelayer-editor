import { useEffect } from 'react'

export interface HistoryAction {
  id: string
  type: string
  description: string
  timestamp: Date
  layerId?: string
  previousState?: any
  newState?: any
}

interface HistoryPanelProps {
  history: HistoryAction[]
  onUndo: (actionId: string) => void
  onClearHistory: () => void
}

export const HistoryPanel = ({ history, onUndo, onClearHistory }: HistoryPanelProps) => {
  const recentHistory = history.slice(-20).reverse()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (history.length > 0) {
          const lastAction = history[history.length - 1]
          onUndo(lastAction.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [history, onUndo])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'add_layer': return '➕'
      case 'remove_layer': return '🗑️'
      case 'update_layer': return '✏️'
      case 'reorder_layers': return '🔄'
      case 'ai_edit': return '🤖'
      case 'export': return '📥'
      default: return '📝'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Historia</span>
        <button onClick={onClearHistory} style={styles.clearBtn}>
          Limpiar
        </button>
      </div>

      <div style={styles.shortcut}>
        <kbd style={styles.kbd}>Ctrl</kbd> + <kbd style={styles.kbd}>Z</kbd> para deshacer
      </div>

      <div style={styles.historyList}>
        {recentHistory.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📜</span>
            <p style={styles.emptyText}>Sin acciones recientes</p>
          </div>
        ) : (
          recentHistory.map((action) => (
            <div
              key={action.id}
              style={styles.historyItem}
              onClick={() => onUndo(action.id)}
            >
              <span style={styles.actionIcon}>{getActionIcon(action.type)}</span>
              <div style={styles.actionInfo}>
                <span style={styles.actionDesc}>{action.description}</span>
                <span style={styles.actionTime}>{formatTime(action.timestamp)}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  onUndo(action.id)
                }}
                style={styles.undoBtn}
              >
                ↩
              </button>
            </div>
          ))
        )}
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
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#e94560',
    fontSize: '11px',
    cursor: 'pointer'
  },
  shortcut: {
    padding: '8px 16px',
    background: '#0f3460',
    fontSize: '11px',
    color: '#aaa',
    textAlign: 'center'
  },
  kbd: {
    background: '#1a1a2e',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    border: '1px solid #333'
  },
  historyList: {
    flex: 1,
    overflow: 'auto',
    padding: '8px'
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    background: '#0f3460',
    borderRadius: '8px',
    marginBottom: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  actionIcon: {
    fontSize: '16px',
    flexShrink: 0
  },
  actionInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  actionDesc: {
    fontSize: '12px',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  actionTime: {
    fontSize: '10px',
    color: '#666'
  },
  undoBtn: {
    background: '#e94560',
    border: 'none',
    borderRadius: '4px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '14px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
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
