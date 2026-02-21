import { describe, expect, test } from 'bun:test'
import { HTTP_METHODS, METHOD_COLORS, isHttpMethod } from '@/utils/http-method.js'

describe('isHttpMethod', () => {
  test('returns true for all valid methods', () => {
    for (const method of HTTP_METHODS) {
      expect(isHttpMethod(method)).toBe(true)
    }
  })

  test('returns false for invalid strings', () => {
    expect(isHttpMethod('CONNECT')).toBe(false)
    expect(isHttpMethod('foo')).toBe(false)
    expect(isHttpMethod('')).toBe(false)
  })
})

describe('HTTP_METHODS', () => {
  test('contains exactly 8 methods', () => {
    expect(HTTP_METHODS).toHaveLength(8)
  })
})

describe('METHOD_COLORS', () => {
  test('maps methods to correct colors', () => {
    expect(METHOD_COLORS.get).toBe('green')
    expect(METHOD_COLORS.post).toBe('blue')
    expect(METHOD_COLORS.delete).toBe('red')
    expect(METHOD_COLORS.patch).toBe('cyan')
    expect(METHOD_COLORS.put).toBe('orange')
  })
})
