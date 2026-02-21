import type { HttpMethod } from '@/types/index.js'

export const HTTP_METHODS: readonly HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
]

const HTTP_METHOD_SET = new Set<string>(HTTP_METHODS)

export function isHttpMethod(value: string): value is HttpMethod {
  return HTTP_METHOD_SET.has(value)
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
  get: 'green',
  post: 'blue',
  put: 'yellow',
  delete: 'red',
  patch: 'cyan',
  options: 'magenta',
  head: 'white',
  trace: 'gray',
}

export const METHOD_SORT_ORDER: Record<HttpMethod, number> = {
  get: 0,
  post: 1,
  put: 2,
  patch: 3,
  delete: 4,
  options: 5,
  head: 6,
  trace: 7,
}
