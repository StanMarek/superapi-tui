#!/usr/bin/env node
import { render } from 'ink'
import { SpecLoader } from './components/SpecLoader.js'

if (process.argv.length > 3) {
  console.error('Error: too many arguments. Expected: superapi-tui <file-or-url>')
  process.exit(1)
}

const input = process.argv[2] || undefined

try {
  const { waitUntilExit } = render(<SpecLoader input={input} />)
  await waitUntilExit()
} catch (error) {
  console.error('Fatal:', error instanceof Error ? error.message : error)
  process.exit(1)
}
