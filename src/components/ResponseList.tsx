import { Box, Text } from 'ink'
import { SchemaView } from './SchemaView.js'
import type { ResponseInfo, SchemaInfo } from '@/types/index.js'

interface Props {
  readonly responses: readonly ResponseInfo[]
  readonly onNavigateRef: (schema: SchemaInfo, label: string) => void
  readonly maxLines?: number
}

function statusColor(code: string): string | undefined {
  if (code.startsWith('2')) return 'green'
  if (code.startsWith('3')) return 'yellow'
  if (code.startsWith('4')) return 'yellow'
  if (code.startsWith('5')) return 'red'
  return undefined
}

function estimateSchemaLines(schema: SchemaInfo, depth: number = 0): number {
  if (depth > 10) return 1
  if (schema.refName && depth > 0) return 1

  let lines = 0

  // Composition types
  for (const key of ['allOf', 'oneOf', 'anyOf'] as const) {
    const schemas = schema[key]
    if (schemas && schemas.length > 0) {
      lines += 1 // composition label
      for (const sub of schemas) {
        lines += estimateSchemaLines(sub, depth + 1)
      }
    }
  }

  // Object properties
  if (schema.properties) {
    for (const [, propSchema] of schema.properties) {
      lines += 1 // property line
      // Nested inline objects add lines
      if (propSchema.properties && !propSchema.refName) {
        lines += estimateSchemaLines(propSchema, depth + 1)
      }
    }
  } else if (lines === 0) {
    lines = 1 // primitive type display
  }

  return Math.max(1, lines)
}

function estimateResponseLines(response: ResponseInfo): number {
  let lines = 1 // status line
  if (response.content.length > 0) {
    for (const media of response.content) {
      lines += 1 // media type line
      if (media.schema) {
        if (media.schema.refName) lines += 1
        lines += estimateSchemaLines(media.schema)
      }
    }
  } else {
    lines += 1 // "(no content)"
  }
  if (response.headers.length > 0) {
    lines += 1 + response.headers.length // header label + each header
  }
  lines += 1 // marginBottom
  return lines
}

export function ResponseList({ responses, onNavigateRef, maxLines }: Props) {
  if (responses.length === 0) {
    return <Text dimColor>No responses</Text>
  }

  let responsesToRender = responses
  let truncated = false

  if (maxLines !== undefined) {
    let linesUsed = 0
    let count = 0
    for (const response of responses) {
      const cost = estimateResponseLines(response)
      if (linesUsed + cost > maxLines && count > 0) {
        truncated = true
        break
      }
      linesUsed += cost
      count++
    }
    responsesToRender = responses.slice(0, count)
  }

  const remaining = responses.length - responsesToRender.length

  return (
    <Box flexDirection="column">
      {responsesToRender.map(response => (
        <Box key={response.statusCode} flexDirection="column" marginBottom={1}>
          <Text>
            <Text bold color={statusColor(response.statusCode)}>
              {response.statusCode}
            </Text>
            <Text> {response.description}</Text>
          </Text>
          {response.content.length > 0 ? (
            response.content.map(media => (
              <Box key={media.mediaType} flexDirection="column" paddingLeft={2}>
                <Text dimColor>{media.mediaType}</Text>
                {media.schema && (
                  <Box flexDirection="column" paddingLeft={2}>
                    {media.schema.refName && (
                      <Text color="cyan">{media.schema.refName}</Text>
                    )}
                    <SchemaView
                      schema={media.schema}
                      cursorIndex={-1}
                      onNavigateRef={onNavigateRef}
                    />
                  </Box>
                )}
              </Box>
            ))
          ) : (
            <Text dimColor>
              {'  '}(no content)
            </Text>
          )}
          {response.headers.length > 0 && (
            <Box flexDirection="column" paddingLeft={2}>
              <Text dimColor bold>Headers:</Text>
              {response.headers.map(header => (
                <Box key={header.name} paddingLeft={2}>
                  <Text>
                    {header.name}
                    {'  '}
                    <Text dimColor>{header.schema?.displayType ?? '(no schema)'}</Text>
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
      {truncated && remaining > 0 && (
        <Text dimColor>... {remaining} more responses</Text>
      )}
    </Box>
  )
}
