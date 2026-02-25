import { useState, useEffect, useCallback } from 'react'
import { Box, Text } from 'ink'
import { Select, Spinner, TextInput } from '@inkjs/ui'
import { loadConfig as defaultLoadConfig } from '@/config/index.js'
import type { SavedServer, ConfigData } from '@/config/index.js'

export interface LauncherDeps {
  readonly loadConfig: () => Promise<ConfigData>
}

interface Props {
  readonly onSelect: (input: string) => void
  readonly deps?: LauncherDeps
}

type Phase =
  | { readonly kind: 'loading' }
  | { readonly kind: 'select'; readonly servers: readonly SavedServer[] }
  | { readonly kind: 'url-input' }

const MANUAL_ENTRY_VALUE = '__manual__'

export function Launcher({ onSelect, deps }: Props) {
  const resolvedLoadConfig = deps?.loadConfig ?? defaultLoadConfig
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const config = await resolvedLoadConfig()
        if (cancelled) return

        if (config.servers.length === 0) {
          setPhase({ kind: 'url-input' })
        } else {
          setPhase({ kind: 'select', servers: config.servers })
        }
      } catch {
        if (cancelled) return
        setPhase({ kind: 'url-input' })
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectChange = useCallback(
    (value: string) => {
      if (value === MANUAL_ENTRY_VALUE) {
        setPhase({ kind: 'url-input' })
      } else {
        onSelect(value)
      }
    },
    [onSelect],
  )

  const handleUrlSubmit = useCallback(
    (value: string) => {
      if (value.trim().length > 0) {
        onSelect(value.trim())
      }
    },
    [onSelect],
  )

  if (phase.kind === 'loading') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          superapi-tui
        </Text>
        <Box marginTop={1}>
          <Spinner label="Loading config..." />
        </Box>
      </Box>
    )
  }

  if (phase.kind === 'select') {
    const options = [
      ...phase.servers.map(s => ({
        label: `${s.name} — ${s.url}`,
        value: s.url,
      })),
      { label: 'Enter URL or file path...', value: MANUAL_ENTRY_VALUE },
    ]

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          superapi-tui
        </Text>
        <Text dimColor>Select a server or enter a spec URL</Text>
        <Box marginTop={1}>
          <Select options={options} onChange={handleSelectChange} />
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        superapi-tui
      </Text>
      <Text dimColor>Enter a spec URL or file path</Text>
      <Box marginTop={1}>
        <TextInput placeholder="https://... or ./path.yaml" onSubmit={handleUrlSubmit} />
      </Box>
    </Box>
  )
}
