#!/usr/bin/env node
declare const __APP_VERSION__: string

import { render } from 'ink'
import { SpecLoader } from './components/SpecLoader.js'

const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev'

const args = process.argv.slice(2)

if (args.includes('--version') || args.includes('-v')) {
  console.log(version)
  process.exit(0)
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`superapi-tui v${version}

Usage: superapi-tui [file-or-url]

Arguments:
  file-or-url    OpenAPI spec file (.yaml/.json), direct spec URL,
                 or Swagger UI URL (auto-detected)

Options:
  -h, --help     Show this help message
  -v, --version  Show version number

Examples:
  superapi-tui ./openapi.yaml
  superapi-tui https://petstore3.swagger.io/api/v3/openapi.json
  superapi-tui https://petstore.swagger.io/

Run without arguments to launch the interactive server picker.`)
  process.exit(0)
}

const positional = args.filter(a => !a.startsWith('-'))
if (positional.length > 1) {
  console.error('Error: too many arguments. Expected: superapi-tui <file-or-url>')
  console.error('Run superapi-tui --help for usage.')
  process.exit(1)
}

const input = positional[0] || undefined

try {
  const { waitUntilExit } = render(<SpecLoader input={input} />)
  await waitUntilExit()
} catch (error) {
  console.error('Fatal:', error instanceof Error ? error.message : error)
  process.exit(1)
}
