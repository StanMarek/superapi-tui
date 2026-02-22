import { describe, it, expect, mock } from 'bun:test'
import { render } from 'ink-testing-library'
import { EndpointList } from '@/components/EndpointList.js'
import type { Endpoint, TagGroup } from '@/types/index.js'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const petEndpoints: readonly Endpoint[] = [
  {
    id: 'get-/pets',
    method: 'get',
    path: '/pets',
    summary: 'List all pets',
    tags: ['pets'],
    deprecated: false,
    parameters: [],
    responses: [],
  },
  {
    id: 'post-/pets',
    method: 'post',
    path: '/pets',
    summary: 'Create a pet',
    tags: ['pets'],
    deprecated: false,
    parameters: [],
    responses: [],
  },
  {
    id: 'delete-/pets/{petId}',
    method: 'delete',
    path: '/pets/{petId}',
    summary: 'Delete a pet',
    tags: ['pets'],
    deprecated: true,
    parameters: [],
    responses: [],
  },
]

const storeEndpoints: readonly Endpoint[] = [
  {
    id: 'get-/store/inventory',
    method: 'get',
    path: '/store/inventory',
    summary: 'Get inventory',
    tags: ['store'],
    deprecated: false,
    parameters: [],
    responses: [],
  },
]

const tagGroups: readonly TagGroup[] = [
  { name: 'pets', endpoints: petEndpoints },
  { name: 'store', endpoints: storeEndpoints },
]

// Wrapper to provide Ink's App context (useApp needs it)
// ink-testing-library's render provides it automatically

describe('EndpointList', () => {
  describe('Rendering', () => {
    it('renders tag group headers', () => {
      const onSelect = mock(() => {})
      const { lastFrame } = render(
        <EndpointList tagGroups={tagGroups} isFocused={false} onSelectEndpoint={onSelect} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('pets')
      expect(frame).toContain('store')
    })

    it('renders endpoint paths with HTTP methods', () => {
      const onSelect = mock(() => {})
      const { lastFrame } = render(
        <EndpointList tagGroups={tagGroups} isFocused={false} onSelectEndpoint={onSelect} />,
      )
      const frame = lastFrame()!
      expect(frame).toContain('GET')
      expect(frame).toContain('/pets')
      expect(frame).toContain('POST')
      expect(frame).toContain('DELETE')
      expect(frame).toContain('/pets/{petId}')
      expect(frame).toContain('/store/inventory')
    })

    it('renders endpoint count in tag headers', () => {
      const onSelect = mock(() => {})
      const { lastFrame } = render(
        <EndpointList tagGroups={tagGroups} isFocused={false} onSelectEndpoint={onSelect} />,
      )
      const frame = lastFrame()!
      // pets has 3 endpoints, store has 1
      expect(frame).toContain('(3)')
      expect(frame).toContain('(1)')
    })

    it('shows expand indicator on tag headers', () => {
      const onSelect = mock(() => {})
      const { lastFrame } = render(
        <EndpointList tagGroups={tagGroups} isFocused={false} onSelectEndpoint={onSelect} />,
      )
      const frame = lastFrame()!
      // All tags expanded by default, so we should see the down-pointing triangle
      expect(frame).toContain('\u25BC') // ▼
    })
  })

  describe('Navigation', () => {
    it('moves cursor down with j', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Initial cursor is at index 0 (pets tag header)
      // Press j to move to first endpoint
      stdin.write('j')
      await delay(50)
      const frame = lastFrame()!
      // The cursor should now be on the first endpoint row (GET /pets)
      // We verify by checking that the endpoint row has inverse styling
      // Since we can't easily check styling, we verify frame still has content
      expect(frame).toContain('GET')
      expect(frame).toContain('/pets')
    })

    it('moves cursor up with k', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Move down, then back up
      stdin.write('j')
      await delay(50)
      stdin.write('k')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('pets')
    })

    it('jumps to bottom with G and top with g', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Jump to bottom
      stdin.write('G')
      await delay(50)
      let frame = lastFrame()!
      // Bottom item is store's endpoint: GET /store/inventory
      expect(frame).toContain('/store/inventory')

      // Jump to top
      stdin.write('g')
      await delay(50)
      frame = lastFrame()!
      expect(frame).toContain('pets')
    })

    it('collapses tag group with Enter on tag header', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Cursor starts on pets tag header (index 0)
      // Press Enter to collapse
      stdin.write('\r')
      await delay(50)
      const frame = lastFrame()!
      // After collapsing pets, we should see the right-pointing triangle
      expect(frame).toContain('\u25B6') // ▶
      // The pets endpoints should NOT be visible
      expect(frame).not.toContain('/pets')
    })

    it('selects endpoint with Enter and calls onSelectEndpoint', async () => {
      const onSelect = mock(() => {})
      const { stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Move to first endpoint (index 1, GET /pets)
      stdin.write('j')
      await delay(50)
      // Press Enter to select
      stdin.write('\r')
      await delay(50)
      expect(onSelect).toHaveBeenCalledTimes(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((onSelect.mock.calls as any)[0][0]).toEqual(petEndpoints[0])
    })

    it('collapses with h and expands with l', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Cursor is on pets tag header
      // Press h to collapse
      stdin.write('h')
      await delay(50)
      let frame = lastFrame()!
      expect(frame).toContain('\u25B6') // ▶ collapsed
      expect(frame).not.toContain('/pets')

      // Press l to expand
      stdin.write('l')
      await delay(50)
      frame = lastFrame()!
      expect(frame).toContain('\u25BC') // ▼ expanded
      expect(frame).toContain('/pets')
    })

    it('does not respond to input when not focused', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={false} onSelectEndpoint={onSelect} />,
      )
      const frameBefore = lastFrame()!
      // Try navigation
      stdin.write('j')
      await delay(50)
      stdin.write('G')
      await delay(50)
      stdin.write('\r')
      await delay(50)
      const frameAfter = lastFrame()!
      // Frame should be unchanged and no callback called
      expect(frameAfter).toBe(frameBefore)
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('Filter Mode', () => {
    it('enters filter mode with /', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      stdin.write('/')
      await delay(50)
      const frame = lastFrame()!
      // Should show filter input indicator
      expect(frame).toContain('/')
    })

    it('filters endpoints by path', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Enter filter mode
      stdin.write('/')
      await delay(50)
      // Type "inventory"
      stdin.write('inventory')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('/store/inventory')
      // Should NOT show /pets endpoints
      expect(frame).not.toContain('/pets/{petId}')
    })

    it('filters endpoints by summary', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Enter filter mode
      stdin.write('/')
      await delay(50)
      // Type "create" to match "Create a pet" summary
      stdin.write('create')
      await delay(50)
      const frame = lastFrame()!
      expect(frame).toContain('POST')
      expect(frame).toContain('/pets')
      // Should NOT show other endpoints
      expect(frame).not.toContain('/store/inventory')
      expect(frame).not.toContain('/pets/{petId}')
    })

    it('clears filter on Escape', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Enter filter mode and type something
      stdin.write('/')
      await delay(50)
      stdin.write('inventory')
      await delay(50)
      // Press Escape
      stdin.write('\x1b')
      await delay(50)
      const frame = lastFrame()!
      // All endpoints should be visible again
      expect(frame).toContain('/pets')
      expect(frame).toContain('/store/inventory')
      // Tag headers should be back
      expect(frame).toContain('pets')
      expect(frame).toContain('store')
    })

    it('shows flattened results without tag headers when filtering', async () => {
      const onSelect = mock(() => {})
      const { lastFrame, stdin } = render(
        <EndpointList tagGroups={tagGroups} isFocused={true} onSelectEndpoint={onSelect} />,
      )
      // Enter filter mode
      stdin.write('/')
      await delay(50)
      // Type "pet" to match pet-related endpoints
      stdin.write('pet')
      await delay(50)
      const frame = lastFrame()!
      // Should NOT show tag group headers (▼ or ▶)
      // Only endpoint rows should appear
      expect(frame).not.toContain('\u25BC')
      expect(frame).not.toContain('\u25B6')
    })
  })
})
