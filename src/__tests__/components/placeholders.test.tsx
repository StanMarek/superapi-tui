import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import { RequestPanel } from '@/components/RequestPanel.js'
import type { Endpoint } from '@/types/index.js'

const mockEndpoint: Endpoint = {
  id: 'get-/pets',
  method: 'get',
  path: '/pets',
  summary: 'List all pets',
  tags: ['pets'],
  deprecated: false,
  parameters: [],
  responses: [],
}

describe('RequestPanel', () => {
  it('shows "No endpoint selected" when no endpoint', () => {
    const { lastFrame } = render(<RequestPanel endpoint={null} isFocused={false} />)
    expect(lastFrame()).toContain('No endpoint selected')
  })

  it('shows endpoint info when selected', () => {
    const { lastFrame } = render(<RequestPanel endpoint={mockEndpoint} isFocused={false} />)
    expect(lastFrame()).toContain('GET')
    expect(lastFrame()).toContain('/pets')
  })
})
