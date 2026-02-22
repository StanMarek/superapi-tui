import type { HttpMethod } from './endpoint.js'

export type ResponseTab = 'pretty' | 'raw' | 'headers'

export interface RequestOptions {
  readonly method: HttpMethod
  readonly url: string
  readonly headers: ReadonlyMap<string, string>
  readonly body?: string
}

export interface HttpResponse {
  readonly status: number
  readonly statusText: string
  readonly headers: ReadonlyMap<string, string>
  readonly body: string
  readonly durationMs: number
}

export class HttpRequestError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = 'HttpRequestError'
  }
}
