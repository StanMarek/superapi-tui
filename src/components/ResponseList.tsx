import { Box, Text } from 'ink'
import { SchemaView } from './SchemaView.js'
import type { ResponseInfo, SchemaInfo } from '@/types/index.js'

interface Props {
  readonly responses: readonly ResponseInfo[]
  readonly onNavigateRef: (schema: SchemaInfo, label: string) => void
}

function statusColor(code: string): string | undefined {
  if (code.startsWith('2')) return 'green'
  if (code.startsWith('3')) return 'yellow'
  if (code.startsWith('4')) return 'yellow'
  if (code.startsWith('5')) return 'red'
  return undefined
}

export function ResponseList({ responses, onNavigateRef }: Props) {
  if (responses.length === 0) {
    return <Text dimColor>No responses</Text>
  }

  return (
    <Box flexDirection="column">
      {responses.map(response => (
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
                    <Text dimColor>{header.schema?.displayType ?? 'string'}</Text>
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Box>
  )
}
