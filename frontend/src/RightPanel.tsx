import { useState } from 'react'
import { Layer } from '../useLayerStore'
import { LayerPanel } from './LayerPanel'
import { AdjustmentsPanel } from './AdjustmentsPanel'
import { HistoryPanel, HistoryAction } from './HistoryPanel'

type TabType = 'layers' | 'adjustments' | 'history'

interface RightPanelProps {
  layers: Layer[]
  selectedLayerId: string | null
  onSelectLayer: (id: string) => void
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void
  onRemoveLayer: (id: string) => void
  onReorderLayers: (fromIndex: number, toIndex: number) => void
  history: HistoryAction[]
  onUndo: (actionId: string) => void
  onClearHistory: () => void
}

export const RightPanel = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onRemoveLayer,
  onReorderLayers,
  history,
  onUndo,
  onClearHistory
}: RightPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('layers')

  const selectedLayer = layers.find(l => l.id === selectedLayerId) || null

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'layers', label: 'Capas', icon: '📑' },
    { id: 'adjustments', label: 'Ajustes', icon: '🎨' },
    { id: 'history', label: 'Historia', icon: '📜' }
  ]

  return (
    <div style={styles.container}>
      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.activeTab : {})
            }}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            <span style={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {activeTab === 'layers' && (
          <LayerPanel
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={onSelectLayer}
            onUpdateLayer={onUpdateLayer}
            onRemoveLayer={onRemoveLayer}
            onReorderLayers={onReorderLayers}
          />
        )}

        {activeTab === 'adjustments' && (
          <AdjustmentsPanel
            selectedLayer={selectedLayer}
            onUpdateLayer={onUpdateLayer}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPanel
            history={history}
            onUndo={onUndo}
            onClearHistory={onClearHistory}
          />
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#16213e'
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #0f3460',
    background: '#1a1a2e'
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activeTab: {
    background: '#16213e',
    borderBottom: '2px solid #e94560'
  },
  tabIcon: {
    fontSize: '16px'
  },
  tabLabel: {
    fontSize: '11px',
    color: '#aaa'
  },
  tabContent: {
    flex: 1,
    overflow: 'hidden'
  }
}
