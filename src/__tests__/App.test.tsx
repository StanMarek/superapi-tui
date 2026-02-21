import { describe, it, expect } from 'bun:test'
import { render } from 'ink-testing-library'
import App from '../App.js'

describe('App', () => {
  it('renders the app title', () => {
    const { lastFrame } = render(<App />)
    expect(lastFrame()).toContain('superapi-tui')
  })
})
