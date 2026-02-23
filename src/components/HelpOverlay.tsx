import { Box, Text } from 'ink'

interface Keybinding {
  readonly key: string
  readonly description: string
}

interface Section {
  readonly title: string
  readonly bindings: readonly Keybinding[]
}

const KEYBINDING_SECTIONS: readonly Section[] = [
  {
    title: 'Global',
    bindings: [
      { key: 'q / Ctrl+C', description: 'Quit' },
      { key: 'Tab', description: 'Next panel' },
      { key: 'Shift+Tab', description: 'Previous panel' },
      { key: 'f', description: 'Toggle fullscreen' },
      { key: '?', description: 'Toggle help' },
    ],
  },
  {
    title: 'Navigation',
    bindings: [
      { key: 'j / Down', description: 'Move down' },
      { key: 'k / Up', description: 'Move up' },
      { key: 'g', description: 'Go to top' },
      { key: 'G', description: 'Go to bottom' },
      { key: 'Enter / l', description: 'Expand / enter' },
      { key: 'Esc / h', description: 'Collapse / back' },
    ],
  },
  {
    title: 'Endpoint List',
    bindings: [
      { key: '/', description: 'Filter endpoints' },
      { key: 'Esc', description: 'Clear filter' },
    ],
  },
  {
    title: 'Endpoint Detail',
    bindings: [
      { key: 'Enter', description: 'Expand section / schema' },
      { key: 'Esc / h', description: 'Collapse / go back' },
    ],
  },
  {
    title: 'Request Panel',
    bindings: [
      { key: 's', description: 'Send request' },
      { key: 'S', description: 'Switch server' },
      { key: 'a', description: 'Toggle auth config' },
      { key: 'e', description: 'Edit body' },
      { key: 'W', description: 'Save server + auth to config' },
      { key: '1 / 2 / 3', description: 'Response tab (Pretty/Raw/Headers)' },
    ],
  },
]

const KEY_WIDTH = 20

export function HelpOverlay() {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={2}
      paddingY={1}
      width="100%"
      height="100%"
    >
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">Keyboard Shortcuts</Text>
      </Box>

      {KEYBINDING_SECTIONS.map((section, sectionIdx) => (
        <Box key={section.title} flexDirection="column" marginBottom={sectionIdx < KEYBINDING_SECTIONS.length - 1 ? 1 : 0}>
          <Text bold underline>{section.title}</Text>
          {section.bindings.map(binding => (
            <Box key={binding.key}>
              <Box width={KEY_WIDTH}>
                <Text color="yellow">{binding.key}</Text>
              </Box>
              <Text>{binding.description}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box justifyContent="center" marginTop={1}>
        <Text dimColor>Press ? or Esc to dismiss</Text>
      </Box>
    </Box>
  )
}
