#!/usr/bin/env node
import { render } from 'ink'
import { SpecLoader } from './components/SpecLoader.js'

const input = process.argv[2]
render(<SpecLoader input={input} />)
