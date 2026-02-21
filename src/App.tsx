import { Box, Text } from 'ink'

export default function App() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        superapi-tui
      </Text>
      <Text dimColor>OpenAPI v3.0/v3.1 Terminal Browser</Text>
    </Box>
  )
}
