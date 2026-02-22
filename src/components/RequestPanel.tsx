import { useState, useMemo, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { Spinner } from '@inkjs/ui'
import type { Endpoint, ServerInfo, ResponseTab } from '@/types/index.js'
import { METHOD_COLORS } from '@/utils/http-method.js'
import { useRequestState } from '@/hooks/useRequestState.js'
import { useScrollableList } from '@/hooks/useScrollableList.js'
import { resolveServerUrl } from '@/http/index.js'

interface Props {
  readonly endpoint: Endpoint | null
  readonly isFocused: boolean
  readonly servers: readonly ServerInfo[]
  readonly onTextCaptureChange?: (active: boolean) => void
}

type RowType = 'server' | 'param' | 'body-editor' | 'send' | 'response-tabs' | 'response-content'

interface Row {
  readonly type: RowType
  readonly label: string
  readonly paramKey?: string
}

const PRETTY_LINE_CAP = 40
const RAW_CHAR_CAP = 2000

const TAB_KEYS: Record<string, ResponseTab> = {
  '1': 'pretty',
  '2': 'raw',
  '3': 'headers',
}

function buildRows(endpoint: Endpoint): readonly Row[] {
  const rows: Row[] = []

  rows.push({ type: 'server', label: 'Server' })

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

function formatPrettyResponse(body: string): readonly string[] {
  try {
    const parsed = JSON.parse(body)
    const pretty = JSON.stringify(parsed, null, 2)
    const lines = pretty.split('\n')
    if (lines.length > PRETTY_LINE_CAP) {
      const truncated = lines.slice(0, PRETTY_LINE_CAP)
      truncated.push(`... (${lines.length - PRETTY_LINE_CAP} more lines)`)
      return truncated
    }
    return lines
  } catch {
    return [body]
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

export function RequestPanel({ endpoint, isFocused, servers, onTextCaptureChange }: Props) {
  const state = useRequestState(endpoint)
  const [editingParam, setEditingParam] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState(false)
  const [editBuffer, setEditBuffer] = useState('')

  const rows = useMemo(
    () => (endpoint ? buildRows(endpoint) : []),
    [endpoint],
  )

  const { cursorIndex, moveUp, moveDown, moveToTop, moveToBottom } = useScrollableList(rows.length)

  const isTextCapturing = editingParam !== null || editingBody

  useEffect(() => {
    onTextCaptureChange?.(isTextCapturing)
  }, [isTextCapturing, onTextCaptureChange])

  // Reset editing state on endpoint change
  useEffect(() => {
    setEditingParam(null)
    setEditingBody(false)
    setEditBuffer('')
  }, [endpoint])

  useInput(
    (input, key) => {
      // Param editing mode
      if (editingParam !== null) {
        if (key.return || key.escape) {
          if (key.return) {
            state.setParamValue(editingParam, editBuffer)
          }
          setEditingParam(null)
          setEditBuffer('')
          return
        }
        if (key.backspace || key.delete) {
          setEditBuffer(prev => prev.slice(0, -1))
          return
        }
        if (input && !key.ctrl && !key.meta) {
          setEditBuffer(prev => prev + input)
        }
        return
      }

      // Body editing mode
      if (editingBody) {
        if (key.escape) {
          state.setBodyText(editBuffer)
          state.validateBody()
          setEditingBody(false)
          return
        }
        if (key.return) {
          setEditBuffer(prev => prev + '\n')
          return
        }
        if (key.backspace || key.delete) {
          setEditBuffer(prev => prev.slice(0, -1))
          return
        }
        if (input && !key.ctrl && !key.meta) {
          setEditBuffer(prev => prev + input)
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

      // Server cycle
      if (input === 'S') {
        state.cycleServer()
        return
      }

      // Send request
      if (input === 's') {
        state.send(servers)
        return
      }

      // Response tab switching
      if (input in TAB_KEYS) {
        state.setActiveTab(TAB_KEYS[input])
        return
      }

      // Enter: start editing param or trigger send
      if (key.return) {
        const row = rows[cursorIndex]
        if (row?.type === 'param' && row.paramKey) {
          setEditingParam(row.paramKey)
          setEditBuffer(state.paramValues.get(row.paramKey) ?? '')
          return
        }
        if (row?.type === 'send') {
          state.send(servers)
          return
        }
      }

      // e: enter body edit mode
      if (input === 'e') {
        const row = rows[cursorIndex]
        if (row?.type === 'body-editor') {
          setEditingBody(true)
          setEditBuffer(state.bodyText)
          return
        }
      }
    },
    { isActive: isFocused && endpoint !== null },
  )

  if (!endpoint) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold dimColor={!isFocused}>Request / Response</Text>
        <Text dimColor>No endpoint selected</Text>
      </Box>
    )
  }

  const serverIdx = servers.length > 0 ? state.selectedServerIndex % servers.length : -1
  const currentServer = serverIdx >= 0 ? servers[serverIdx] : null

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>Request / Response</Text>
      <Box marginTop={1}>
        <Text color={METHOD_COLORS[endpoint.method]}>{endpoint.method.toUpperCase()}</Text>
        <Text> {endpoint.path}</Text>
      </Box>

      {rows.map((row, index) => {
        const isSelected = index === cursorIndex && isFocused

        if (row.type === 'server') {
          return (
            <Box key="server" marginTop={1}>
              <Text inverse={isSelected} dimColor={!isFocused}>
                {servers.length === 0
                  ? 'No servers defined'
                  : `Server: ${currentServer ? resolveServerUrl(currentServer) : ''}`}
              </Text>
              {servers.length > 1 && <Text dimColor> (S to cycle)</Text>}
            </Box>
          )
        }

        if (row.type === 'param' && row.paramKey) {
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
            const lines = formatPrettyResponse(res.body)
            return (
              <Box key="response" marginTop={1} flexDirection="column">
                <Text bold>
                  {res.status} {res.statusText} ({res.durationMs}ms)
                </Text>
                {lines.map((line, i) => (
                  <Text key={i} color={colorForJsonLine(line)}>{line}</Text>
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
