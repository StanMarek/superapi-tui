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
  readonly fullscreenPanel: PanelId | null
  readonly showHelp: boolean
}

export function useNavigation(): NavigationState {
  const { exit } = useApp()
  const [focusedPanel, setFocusedPanel] = useState<PanelId>('endpoints')
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null)
  const [textCapture, setTextCapture] = useState(false)
  const [fullscreenPanel, setFullscreenPanel] = useState<PanelId | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  useInput((input, key) => {
    // Priority 1: text capture — only Ctrl+C exits
    if (textCapture) {
      if (input === 'c' && key.ctrl) {
        exit()
      }
      return
    }

    // Priority 2: help overlay — only ? and Esc dismiss, all else suppressed
    if (showHelp) {
      if (input === '?' || key.escape) {
        setShowHelp(false)
      }
      return
    }

    // Priority 3: ? opens help
    if (input === '?') {
      setShowHelp(true)
      return
    }

    // Priority 4: quit
    if (input === 'q' || (input === 'c' && key.ctrl)) {
      exit()
      return
    }

    // Priority 5: Esc exits fullscreen
    if (key.escape && fullscreenPanel !== null) {
      setFullscreenPanel(null)
      return
    }

    // Priority 6: f toggles fullscreen
    if (input === 'f') {
      setFullscreenPanel(current => current !== null ? null : focusedPanel)
      return
    }

    // Priority 7: Tab/Shift+Tab — exit fullscreen + cycle panel
    if (key.tab) {
      setFullscreenPanel(null)
      const direction = key.shift ? -1 : 1
      setFocusedPanel(current => {
        const idx = PANEL_ORDER.indexOf(current)
        return PANEL_ORDER[(idx + direction + PANEL_ORDER.length) % PANEL_ORDER.length]!
      })
    }
  })

  const selectEndpoint = useCallback((endpoint: Endpoint) => {
    setSelectedEndpoint(endpoint)
  }, [])

  return {
    focusedPanel,
    selectedEndpoint,
    selectEndpoint,
    textCapture,
    setTextCapture,
    fullscreenPanel,
    showHelp,
  }
}
