import { useState, useCallback } from 'react'
import { useInput, useApp } from 'ink'
import type { Endpoint } from '@/types/index.js'

export type PanelId = 'endpoints' | 'detail' | 'request'

const PANEL_ORDER: readonly PanelId[] = ['endpoints', 'detail', 'request']

export interface NavigationState {
  readonly focusedPanel: PanelId
  readonly selectedEndpoint: Endpoint | null
  readonly selectEndpoint: (endpoint: Endpoint) => void
  readonly textCapture: boolean
  readonly setTextCapture: (active: boolean) => void
}

export function useNavigation(): NavigationState {
  const { exit } = useApp()
  const [focusedPanel, setFocusedPanel] = useState<PanelId>('endpoints')
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [textCapture, setTextCapture] = useState(false)

  useInput((input, key) => {
    // When a panel is capturing text input, only Ctrl+C should exit
    if (textCapture) {
      if (input === 'c' && key.ctrl) {
        exit()
      }
      return
    }

    if (input === 'q' || (input === 'c' && key.ctrl)) {
      exit()
      return
    }

    if (key.tab) {
      const direction = key.shift ? -1 : 1
      setFocusedPanel(current => {
        const idx = PANEL_ORDER.indexOf(current)
        return PANEL_ORDER[(idx + direction + PANEL_ORDER.length) % PANEL_ORDER.length]
      })
    }
  })

  const selectEndpoint = useCallback((endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint)
  }, [])

  return { focusedPanel, selectedEndpoint, selectEndpoint, textCapture, setTextCapture }
}
