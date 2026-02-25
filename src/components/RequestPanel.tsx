import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import { Spinner } from '@inkjs/ui'
import type { Endpoint, ServerInfo, SecuritySchemeInfo, AuthFieldKey, AuthCredentials, ResponseTab } from '@/types/index.js'
import type { SavedAuth } from '@/config/index.js'
import { getConfigPath } from '@/config/index.js'
import { METHOD_COLORS } from '@/utils/http-method.js'
import { useRequestState } from '@/hooks/useRequestState.js'
import { useScrollableList } from '@/hooks/useScrollableList.js'
import { resolveServerUrl } from '@/http/index.js'

interface Props {
  readonly endpoint: Endpoint | null
  readonly isFocused: boolean
  readonly servers: readonly ServerInfo[]
  readonly securitySchemes: readonly SecuritySchemeInfo[]
  readonly onTextCaptureChange?: (active: boolean) => void
  readonly onSaveServerAuth?: (name: string, url: string, auth?: SavedAuth, swaggerEndpointUrl?: string) => Promise<boolean>
  readonly findAuthForServer?: (specServerUrl: string) => SavedAuth | null
  readonly configLoaded?: boolean
  readonly defaultResponseTab?: ResponseTab
  readonly specLoadUrl?: string
  readonly savedRequestBaseUrl?: string
}

type Row =
  | { readonly type: 'server'; readonly label: string }
  | { readonly type: 'auth-toggle'; readonly label: string }
  | { readonly type: 'auth-type'; readonly label: string }
  | { readonly type: 'auth-field'; readonly label: string; readonly fieldKey: AuthFieldKey }
  | { readonly type: 'param'; readonly label: string; readonly paramKey: string }
  | { readonly type: 'body-editor'; readonly label: string }
  | { readonly type: 'send'; readonly label: string }
  | { readonly type: 'response-tabs'; readonly label: string }
  | { readonly type: 'response-content'; readonly label: string }

const PRETTY_LINE_CAP = 40
const RAW_CHAR_CAP = 2000

const TAB_KEYS = new Map<string, ResponseTab>([
  ['1', 'pretty'],
  ['2', 'raw'],
  ['3', 'headers'],
])

function buildRows(
  endpoint: Endpoint,
  authExpanded: boolean,
  authMethod: 'bearer' | 'apiKey' | 'basic' | undefined,
): readonly Row[] {
  const rows: Row[] = []

  rows.push({ type: 'server', label: 'Server' })
  rows.push({ type: 'auth-toggle', label: 'Auth' })

  if (authExpanded && authMethod) {
    rows.push({ type: 'auth-type', label: 'Auth Type' })

    switch (authMethod) {
      case 'bearer':
        rows.push({ type: 'auth-field', label: 'Token', fieldKey: 'token' })
        break
      case 'apiKey':
        rows.push({ type: 'auth-field', label: 'Key', fieldKey: 'key' })
        break
      case 'basic':
        rows.push({ type: 'auth-field', label: 'Username', fieldKey: 'username' })
        rows.push({ type: 'auth-field', label: 'Password', fieldKey: 'password' })
        break
    }
  }

  for (const param of endpoint.parameters) {
    if (param.location === 'path' || param.location === 'query' || param.location === 'header') {
      rows.push({
        type: 'param',
        label: `${param.location}:${param.name}`,
        paramKey: `${param.location}:${param.name}`,
      })
    }
  }

  const hasJsonBody = endpoint.requestBody?.content.some(
    m => m.mediaType === 'application/json',
  )
  if (hasJsonBody) {
    rows.push({ type: 'body-editor', label: 'Body' })
  }

  rows.push({ type: 'send', label: 'Send Request' })
  rows.push({ type: 'response-tabs', label: 'Response Tabs' })
  rows.push({ type: 'response-content', label: 'Response' })

  return rows
}

interface PrettyResult {
  readonly lines: readonly string[]
  readonly isJson: boolean
}

function formatPrettyResponse(body: string): PrettyResult {
  try {
    const parsed = JSON.parse(body)
    const pretty = JSON.stringify(parsed, null, 2)
    const lines = pretty.split('\n')
    if (lines.length > PRETTY_LINE_CAP) {
      const truncated = lines.slice(0, PRETTY_LINE_CAP)
      truncated.push(`... (${lines.length - PRETTY_LINE_CAP} more lines)`)
      return { lines: truncated, isJson: true }
    }
    return { lines, isJson: true }
  } catch {
    return { lines: [body], isJson: false }
  }
}

function colorForJsonLine(line: string): string {
  const trimmed = line.trim()
  if (trimmed.startsWith('"') && trimmed.includes(':')) return 'cyan'
  if (trimmed.startsWith('"')) return 'green'
  if (/^\d/.test(trimmed) || trimmed === 'true' || trimmed === 'false') return 'yellow'
  if (trimmed === 'null' || trimmed === 'null,') return 'red'
  return 'white'
}

function credentialsToSavedAuth(creds: AuthCredentials): SavedAuth | null {
  switch (creds.method) {
    case 'none':
      return null
    case 'bearer':
      return creds.token ? { method: 'bearer', token: creds.token } : null
    case 'apiKey':
      return creds.key ? { method: 'apiKey', key: creds.key, paramName: creds.paramName, location: creds.location } : null
    case 'basic':
      return (creds.username || creds.password) ? { method: 'basic', username: creds.username, password: creds.password } : null
    default: {
      const _exhaustive: never = creds
      throw new Error(`Unknown auth method: ${(_exhaustive as { method: string }).method}`)
    }
  }
}

export function RequestPanel({ endpoint, isFocused, servers, securitySchemes, onTextCaptureChange, onSaveServerAuth, findAuthForServer, configLoaded, defaultResponseTab, specLoadUrl, savedRequestBaseUrl }: Props) {
  const state = useRequestState(endpoint, securitySchemes, defaultResponseTab)
  const [editingParam, setEditingParam] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState(false)
  const [editingAuthField, setEditingAuthField] = useState<AuthFieldKey | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveNameBuffer, setSaveNameBuffer] = useState('')
  const initialAuthApplied = useRef(false)

  // Ref-backed edit buffer: ref is always current, state is debounced for display.
  // Prevents render storm when terminals send pasted text character-by-character.
  const editBufferRef = useRef('')
  const [editBuffer, setEditBuffer] = useState('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current === null) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null
        setEditBuffer(editBufferRef.current)
      }, 16)
    }
  }, [])

  const flushEditBuffer = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    setEditBuffer(editBufferRef.current)
  }, [])

  const initEditBuffer = useCallback((value: string) => {
    editBufferRef.current = value
    setEditBuffer(value)
  }, [])

  // Cleanup flush timer on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        clearTimeout(flushTimerRef.current)
      }
    }
  }, [])

  const selectedOption = state.auth.availableOptions[state.auth.selectedOptionIndex % state.auth.availableOptions.length]

  const mergedServers = useMemo(() => {
    if (!savedRequestBaseUrl) return servers

    const normalizedSaved = savedRequestBaseUrl.replace(/\/+$/, '').toLowerCase()
    const matchIndex = servers.findIndex(s => {
      const resolved = resolveServerUrl(s)
      return resolved.replace(/\/+$/, '').toLowerCase() === normalizedSaved
    })

    if (matchIndex > 0) {
      // Move matching server to index 0 so it's pre-selected
      const reordered = [...servers]
      const [matched] = reordered.splice(matchIndex, 1)
      return [matched, ...reordered]
    }

    if (matchIndex === 0) return servers

    // Not found — inject as first server
    const injectedServer: ServerInfo = {
      url: savedRequestBaseUrl,
      description: 'Saved override',
      variables: new Map(),
    }
    return [injectedServer, ...servers]
  }, [servers, savedRequestBaseUrl])

  const rows = useMemo(
    () => (endpoint ? buildRows(endpoint, state.auth.authExpanded, selectedOption?.method) : []),
    [endpoint, state.auth.authExpanded, selectedOption?.method],
  )

  const { cursorIndex, moveUp, moveDown, moveToTop, moveToBottom } = useScrollableList(rows.length)

  const isTextCapturing = editingParam !== null || editingBody || editingAuthField !== null || savingProfile

  useEffect(() => {
    onTextCaptureChange?.(isTextCapturing)
  }, [isTextCapturing, onTextCaptureChange])

  // Reset editing state on endpoint change
  useEffect(() => {
    setEditingParam(null)
    setEditingBody(false)
    setEditingAuthField(null)
    initEditBuffer('')
  }, [endpoint, initEditBuffer])

  // Initial auth restoration from config
  useEffect(() => {
    if (initialAuthApplied.current || !findAuthForServer || mergedServers.length === 0) return

    const serverIdx = mergedServers.length > 0 ? state.selectedServerIndex % mergedServers.length : -1
    const currentServer = serverIdx >= 0 ? mergedServers[serverIdx] : null
    if (!currentServer) return

    const serverUrl = resolveServerUrl(currentServer)
    const savedAuth = findAuthForServer(serverUrl)
    if (savedAuth) {
      state.auth.restoreAuth(savedAuth)
      initialAuthApplied.current = true
    }
  }, [mergedServers, findAuthForServer, configLoaded, state.selectedServerIndex])

  useInput(
    (input, key) => {
      // Save profile name editing mode
      if (savingProfile) {
        if (key.return) {
          const trimmedName = saveNameBuffer.trim()
          if (trimmedName.length > 0 && onSaveServerAuth && mergedServers.length > 0) {
            const serverIdx = state.selectedServerIndex % mergedServers.length
            const server = mergedServers[serverIdx]
            if (server) {
              const serverUrl = resolveServerUrl(server)
              const savedAuth = credentialsToSavedAuth(state.auth.credentials)
              onSaveServerAuth(trimmedName, serverUrl, savedAuth ?? undefined, specLoadUrl)
                .then(ok => {
                  if (ok) {
                    setSaveMessage(`Saved to ${getConfigPath()}`)
                  } else {
                    setSaveMessage('Failed to save config')
                  }
                  setTimeout(() => setSaveMessage(null), 2000)
                })
                .catch(() => {
                  setSaveMessage('Failed to save config')
                  setTimeout(() => setSaveMessage(null), 2000)
                })
            }
          }
          setSavingProfile(false)
          setSaveNameBuffer('')
          return
        }
        if (key.escape) {
          setSavingProfile(false)
          setSaveNameBuffer('')
          return
        }
        if (key.backspace || key.delete) {
          setSaveNameBuffer(prev => prev.slice(0, -1))
          return
        }
        if (input && !key.ctrl && !key.meta) {
          setSaveNameBuffer(prev => prev + input)
        }
        return
      }

      // Auth field editing mode
      if (editingAuthField !== null) {
        if (key.return || key.escape) {
          flushEditBuffer()
          if (key.return) {
            state.auth.setAuthField(editingAuthField, editBufferRef.current)
          }
          setEditingAuthField(null)
          initEditBuffer('')
          return
        }
        if (key.backspace || key.delete) {
          editBufferRef.current = editBufferRef.current.slice(0, -1)
          scheduleFlush()
          return
        }
        if (input && !key.ctrl && !key.meta) {
          editBufferRef.current += input
          scheduleFlush()
        }
        return
      }

      // Param editing mode
      if (editingParam !== null) {
        if (key.return || key.escape) {
          flushEditBuffer()
          if (key.return) {
            state.setParamValue(editingParam, editBufferRef.current)
          }
          setEditingParam(null)
          initEditBuffer('')
          return
        }
        if (key.backspace || key.delete) {
          editBufferRef.current = editBufferRef.current.slice(0, -1)
          scheduleFlush()
          return
        }
        if (input && !key.ctrl && !key.meta) {
          editBufferRef.current += input
          scheduleFlush()
        }
        return
      }

      // Body editing mode
      if (editingBody) {
        if (key.escape) {
          flushEditBuffer()
          state.setBodyText(editBufferRef.current)
          state.validateBody(editBufferRef.current)
          setEditingBody(false)
          return
        }
        if (key.return) {
          editBufferRef.current += '\n'
          scheduleFlush()
          return
        }
        if (key.backspace || key.delete) {
          editBufferRef.current = editBufferRef.current.slice(0, -1)
          scheduleFlush()
          return
        }
        if (input && !key.ctrl && !key.meta) {
          editBufferRef.current += input
          scheduleFlush()
        }
        return
      }

      // Normal mode navigation
      if (input === 'j' || key.downArrow) {
        moveDown()
        return
      }
      if (input === 'k' || key.upArrow) {
        moveUp()
        return
      }
      if (input === 'g') {
        moveToTop()
        return
      }
      if (input === 'G') {
        moveToBottom()
        return
      }

      // Auth toggle
      if (input === 'a') {
        state.auth.toggleAuth()
        return
      }

      // Server cycle
      if (input === 'S') {
        state.cycleServer()
        return
      }

      // Send request
      if (input === 's') {
        state.send(mergedServers)
        return
      }

      // Response tab switching
      const tab = TAB_KEYS.get(input)
      if (tab !== undefined) {
        state.setActiveTab(tab)
        return
      }

      // Save server + auth to config
      if (input === 'W') {
        if (onSaveServerAuth && mergedServers.length > 0) {
          const serverIdx = state.selectedServerIndex % mergedServers.length
          const server = mergedServers[serverIdx]
          if (server) {
            const serverUrl = resolveServerUrl(server)
            const defaultName = server.description ?? serverUrl
            setSaveNameBuffer(defaultName)
            setSavingProfile(true)
          }
        }
        return
      }

      // Enter: context-dependent actions
      if (key.return) {
        const row = rows[cursorIndex]
        if (row?.type === 'auth-toggle') {
          state.auth.toggleAuth()
          return
        }
        if (row?.type === 'auth-type') {
          state.auth.cycleAuthOption()
          return
        }
        if (row?.type === 'auth-field') {
          const currentValue = getAuthFieldValue(row.fieldKey)
          setEditingAuthField(row.fieldKey)
          initEditBuffer(currentValue)
          return
        }
        if (row?.type === 'param') {
          setEditingParam(row.paramKey)
          initEditBuffer(state.paramValues.get(row.paramKey) ?? '')
          return
        }
        if (row?.type === 'send') {
          state.send(mergedServers)
          return
        }
      }

      // e: enter body edit mode
      if (input === 'e') {
        const row = rows[cursorIndex]
        if (row?.type === 'body-editor') {
          setEditingBody(true)
          initEditBuffer(state.bodyText)
          return
        }
      }
    },
    { isActive: isFocused && endpoint !== null },
  )

  function getAuthFieldValue(fieldKey: AuthFieldKey): string {
    const creds = state.auth.credentials
    switch (fieldKey) {
      case 'token':
        return creds.method === 'bearer' ? creds.token : ''
      case 'key':
        return creds.method === 'apiKey' ? creds.key : ''
      case 'username':
        return creds.method === 'basic' ? creds.username : ''
      case 'password':
        return creds.method === 'basic' ? creds.password : ''
      default:
        return ''
    }
  }

  if (!endpoint) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold dimColor={!isFocused}>Request / Response</Text>
        <Text dimColor>No endpoint selected</Text>
      </Box>
    )
  }

  const serverIdx = mergedServers.length > 0 ? state.selectedServerIndex % mergedServers.length : -1
  const currentServer = serverIdx >= 0 ? mergedServers[serverIdx] : null

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>Request / Response</Text>
      <Box marginTop={1}>
        <Text color={METHOD_COLORS[endpoint.method]}>{endpoint.method.toUpperCase()}</Text>
        <Text> {endpoint.path}</Text>
      </Box>

      {saveMessage && (
        <Text color="green">{saveMessage}</Text>
      )}

      {savingProfile && (
        <Box marginTop={1}>
          <Text>Profile name: </Text>
          <Text color="cyan">{saveNameBuffer}<Text color="yellow">|</Text></Text>
          <Text dimColor> (Enter to save, Esc to cancel)</Text>
        </Box>
      )}

      {rows.map((row, index) => {
        const isSelected = index === cursorIndex && isFocused

        if (row.type === 'server') {
          return (
            <Box key="server" marginTop={1}>
              <Text inverse={isSelected} dimColor={!isFocused}>
                {mergedServers.length === 0
                  ? 'No servers defined'
                  : `Server: ${currentServer ? resolveServerUrl(currentServer) : ''}`}
              </Text>
              {mergedServers.length > 1 && <Text dimColor> (S to cycle)</Text>}
            </Box>
          )
        }

        if (row.type === 'auth-toggle') {
          return (
            <Box key="auth-toggle" flexDirection="column">
              <Text inverse={isSelected} dimColor={!isFocused}>
                {state.auth.authExpanded ? '[-]' : '[+]'} Auth: {selectedOption?.label ?? 'None'} (a)
              </Text>
              {state.auth.unsupportedSchemes.length > 0 && (
                <Text dimColor color="yellow">
                  Unsupported: {state.auth.unsupportedSchemes.join(', ')}
                </Text>
              )}
            </Box>
          )
        }

        if (row.type === 'auth-type') {
          return (
            <Box key="auth-type">
              <Text inverse={isSelected} dimColor={!isFocused}>
                Type: {selectedOption?.label ?? 'None'}
              </Text>
              <Text dimColor> (Enter to cycle)</Text>
            </Box>
          )
        }

        if (row.type === 'auth-field') {
          const isEditing = editingAuthField === row.fieldKey
          const isMasked = row.fieldKey === 'password'
          const rawValue = isEditing ? editBuffer : getAuthFieldValue(row.fieldKey)
          const displayValue = isMasked && !isEditing && rawValue ? '*'.repeat(rawValue.length) : rawValue

          return (
            <Box key={`auth-${row.fieldKey}`}>
              <Text inverse={isSelected} dimColor={!isFocused}>
                {row.label}: {isEditing ? (
                  <Text color="cyan">{editBuffer}<Text color="yellow">|</Text></Text>
                ) : (
                  <Text>{displayValue || '<empty>'}</Text>
                )}
              </Text>
            </Box>
          )
        }

        if (row.type === 'param') {
          const isEditing = editingParam === row.paramKey
          const value = isEditing ? editBuffer : (state.paramValues.get(row.paramKey) ?? '')
          return (
            <Box key={row.paramKey}>
              <Text inverse={isSelected} dimColor={!isFocused}>
                {row.label}: {isEditing ? (
                  <Text color="cyan">{value}<Text color="yellow">|</Text></Text>
                ) : (
                  <Text>{value || '<empty>'}</Text>
                )}
              </Text>
            </Box>
          )
        }

        if (row.type === 'body-editor') {
          return (
            <Box key="body" flexDirection="column" marginTop={1}>
              <Text inverse={isSelected} dimColor={!isFocused}>
                Body {editingBody ? '(editing - Escape to save)' : '(e to edit)'}
              </Text>
              {editingBody ? (
                <Box paddingLeft={2} flexDirection="column">
                  <Text color="cyan">{editBuffer}<Text color="yellow">|</Text></Text>
                </Box>
              ) : (
                <Box paddingLeft={2} flexDirection="column">
                  {state.bodyText.split('\n').slice(0, 10).map((line, i) => (
                    <Text key={i} dimColor>{line}</Text>
                  ))}
                  {state.bodyText.split('\n').length > 10 && (
                    <Text dimColor>... ({state.bodyText.split('\n').length - 10} more lines)</Text>
                  )}
                </Box>
              )}
              {state.bodyError && (
                <Text color="red">{state.bodyError}</Text>
              )}
            </Box>
          )
        }

        if (row.type === 'send') {
          return (
            <Box key="send" marginTop={1}>
              {state.isLoading ? (
                <Box>
                  <Spinner label="Sending..." />
                </Box>
              ) : (
                <Text inverse={isSelected} bold color={isSelected ? undefined : 'green'}>
                  {'>'} Send Request (s)
                </Text>
              )}
            </Box>
          )
        }

        if (row.type === 'response-tabs') {
          return (
            <Box key="tabs" marginTop={1} gap={1}>
              <Text inverse={isSelected && state.activeTab === 'pretty'} bold={state.activeTab === 'pretty'} color={state.activeTab === 'pretty' ? 'cyan' : undefined}>
                [1] Pretty
              </Text>
              <Text inverse={isSelected && state.activeTab === 'raw'} bold={state.activeTab === 'raw'} color={state.activeTab === 'raw' ? 'cyan' : undefined}>
                [2] Raw
              </Text>
              <Text inverse={isSelected && state.activeTab === 'headers'} bold={state.activeTab === 'headers'} color={state.activeTab === 'headers' ? 'cyan' : undefined}>
                [3] Headers
              </Text>
            </Box>
          )
        }

        if (row.type === 'response-content') {
          if (state.error) {
            return (
              <Box key="response" marginTop={1} flexDirection="column">
                <Text color="red">Error: {state.error}</Text>
              </Box>
            )
          }

          if (!state.response) {
            return (
              <Box key="response" marginTop={1}>
                <Text dimColor>No response yet. Press s to send.</Text>
              </Box>
            )
          }

          const { response: res } = state

          if (state.activeTab === 'pretty') {
            const { lines, isJson } = formatPrettyResponse(res.body)
            return (
              <Box key="response" marginTop={1} flexDirection="column">
                <Text bold>
                  {res.status} {res.statusText} ({res.durationMs}ms)
                </Text>
                {!isJson && <Text dimColor>(Response is not JSON)</Text>}
                {lines.map((line, i) => (
                  <Text key={i} color={isJson ? colorForJsonLine(line) : undefined}>{line}</Text>
                ))}
              </Box>
            )
          }

          if (state.activeTab === 'raw') {
            const raw = res.body.length > RAW_CHAR_CAP
              ? res.body.slice(0, RAW_CHAR_CAP) + `\n... (${res.body.length - RAW_CHAR_CAP} more chars)`
              : res.body
            return (
              <Box key="response" marginTop={1} flexDirection="column">
                <Text bold>
                  {res.status} {res.statusText} ({res.durationMs}ms)
                </Text>
                <Text>{raw}</Text>
              </Box>
            )
          }

          if (state.activeTab === 'headers') {
            return (
              <Box key="response" marginTop={1} flexDirection="column">
                <Text bold>
                  {res.status} {res.statusText} ({res.durationMs}ms)
                </Text>
                {[...res.headers.entries()].map(([key, value]) => (
                  <Box key={key}>
                    <Text color="cyan">{key}</Text>
                    <Text>: {value}</Text>
                  </Box>
                ))}
              </Box>
            )
          }
        }

        return null
      })}
    </Box>
  )
}
