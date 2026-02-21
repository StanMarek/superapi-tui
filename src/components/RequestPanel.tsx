import { Box, Text } from 'ink'
import type { Endpoint } from '@/types/index.js'

interface Props {
  readonly endpoint: Endpoint | null
  readonly isFocused: boolean
}

export function RequestPanel({ endpoint, isFocused }: Props) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>Request / Response</Text>
      {endpoint ? (
        <Box marginTop={1}>
          <Text color="cyan">{endpoint.method.toUpperCase()}</Text>
          <Text> {endpoint.path}</Text>
        </Box>
      ) : (
        <Text dimColor>No endpoint selected</Text>
      )}
    </Box>
  )
}
