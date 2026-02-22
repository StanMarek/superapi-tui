import { describe, it, expect } from 'bun:test'
import React from 'react'
import { render } from 'ink-testing-library'
import { Box, Text, useInput } from 'ink'
import { useSchemaNavigation } from '@/hooks/useSchemaNavigation.js'
import type { SchemaInfo } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const userSchema: SchemaInfo = {
  type: 'object',
  displayType: 'object',
  nullable: false,
  readOnly: false,
  writeOnly: false,
  refName: 'User',
  properties: new Map([
    ['id', { type: 'integer', displayType: 'integer', nullable: false, readOnly: false, writeOnly: false }],
    ['name', { type: 'string', displayType: 'string', nullable: false, readOnly: false, writeOnly: false }],
  ]),
}

const addressSchema: SchemaInfo = {
  type: 'object',
  displayType: 'object',
  nullable: false,
  readOnly: false,
  writeOnly: false,
  refName: 'Address',
}

/**
 * Test harness that renders schema navigation state and responds to key commands:
 *   u = push userSchema, a = push addressSchema, p = pop, r = reset
 */
function TestHarness() {
  const nav = useSchemaNavigation()

  useInput((input) => {
    if (input === 'u') nav.push(userSchema, 'User')
    if (input === 'a') nav.push(addressSchema, 'Address')
    if (input === 'p') nav.pop()
    if (input === 'r') nav.reset()
  })

  return (
    <Box flexDirection="column">
      <Text>view:{nav.currentView}</Text>
      <Text>stack:{nav.stack.length}</Text>
      <Text>breadcrumbs:{nav.breadcrumbs.join(',') || 'none'}</Text>
      <Text>schema:{nav.currentSchema?.refName ?? 'null'}</Text>
    </Box>
  )
}

describe('useSchemaNavigation', () => {
  it('starts in endpoint view with empty stack', () => {
    const { lastFrame } = render(<TestHarness />)
    expect(lastFrame()).toContain('view:endpoint')
    expect(lastFrame()).toContain('stack:0')
    expect(lastFrame()).toContain('breadcrumbs:none')
    expect(lastFrame()).toContain('schema:null')
  })

  it('push switches to schema view', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('u') // push userSchema
    await delay(50)
    expect(lastFrame()).toContain('view:schema')
    expect(lastFrame()).toContain('stack:1')
    expect(lastFrame()).toContain('breadcrumbs:User')
  })

  it('multiple pushes build breadcrumb trail', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('u') // push userSchema
    await delay(50)
    stdin.write('a') // push addressSchema
    await delay(50)
    expect(lastFrame()).toContain('stack:2')
    expect(lastFrame()).toContain('breadcrumbs:User,Address')
  })

  it('pop returns to previous schema', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('u') // push userSchema
    await delay(50)
    stdin.write('a') // push addressSchema
    await delay(50)
    stdin.write('p') // pop
    await delay(50)
    expect(lastFrame()).toContain('stack:1')
    expect(lastFrame()).toContain('breadcrumbs:User')
    expect(lastFrame()).toContain('view:schema')
    expect(lastFrame()).toContain('schema:User')
  })

  it('pop from single-item stack returns to endpoint view', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('u') // push userSchema
    await delay(50)
    stdin.write('p') // pop
    await delay(50)
    expect(lastFrame()).toContain('view:endpoint')
    expect(lastFrame()).toContain('stack:0')
  })

  it('pop from empty stack is a no-op', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('p') // pop on empty stack
    await delay(50)
    expect(lastFrame()).toContain('view:endpoint')
    expect(lastFrame()).toContain('stack:0')
  })

  it('currentSchema returns top of stack', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('u') // push userSchema
    await delay(50)
    expect(lastFrame()).toContain('schema:User')
    stdin.write('a') // push addressSchema
    await delay(50)
    expect(lastFrame()).toContain('schema:Address')
  })

  it('currentSchema is null when stack is empty', () => {
    const { lastFrame } = render(<TestHarness />)
    expect(lastFrame()).toContain('schema:null')
  })

  it('reset clears stack and returns to endpoint view', async () => {
    const { lastFrame, stdin } = render(<TestHarness />)
    stdin.write('u') // push userSchema
    await delay(50)
    stdin.write('a') // push addressSchema
    await delay(50)
    expect(lastFrame()).toContain('stack:2')
    stdin.write('r') // reset
    await delay(50)
    expect(lastFrame()).toContain('view:endpoint')
    expect(lastFrame()).toContain('stack:0')
    expect(lastFrame()).toContain('schema:null')
  })
})
