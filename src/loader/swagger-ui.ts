import { resolveUrl } from '@/utils/index.js'

const SWAGGER_UI_MARKERS = ['swagger-ui', 'SwaggerUIBundle', 'swagger-ui-container']

export function isSwaggerUiPage(content: string): boolean {
  if (!content.includes('<')) return false
  return SWAGGER_UI_MARKERS.some((marker) => content.includes(marker))
}

const SPEC_URL_PATTERNS = [
  /SwaggerUIBundle\(\s*\{[^}]*url\s*:\s*["']([^"']+)["']/s,
  /SwaggerUIBundle\(\s*\{[^}]*url\s*:\s*`([^`]+)`/s,
  /spec-url\s*=\s*["']([^"']+)["']/,
]

export function extractSpecUrl(html: string, baseUrl: string): string | null {
  for (const pattern of SPEC_URL_PATTERNS) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return resolveUrl(match[1], baseUrl)
    }
  }
  return null
}

const CONFIG_URL_PATTERNS = [
  /configUrl\s*:\s*["']([^"']+)["']/,
  /configUrl\s*:\s*`([^`]+)`/,
]

export function extractConfigUrl(content: string, baseUrl: string): string | null {
  for (const pattern of CONFIG_URL_PATTERNS) {
    const match = content.match(pattern)
    if (match?.[1]) {
      return resolveUrl(match[1], baseUrl)
    }
  }
  return null
}

const SCRIPT_SRC_PATTERN = /<script[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi

export function extractExternalScriptUrls(html: string, baseUrl: string): readonly string[] {
  const urls: string[] = []
  let match: RegExpExecArray | null
  while ((match = SCRIPT_SRC_PATTERN.exec(html)) !== null) {
    if (match[1]) {
      urls.push(resolveUrl(match[1], baseUrl))
    }
  }
  // Reset regex state for next call
  SCRIPT_SRC_PATTERN.lastIndex = 0
  return urls
}

export function isSameOrigin(url: string, baseUrl: string): boolean {
  try {
    const a = new URL(url)
    const b = new URL(baseUrl)
    return a.origin === b.origin
  } catch {
    return false
  }
}

interface SwaggerConfig {
  readonly url?: string
  readonly urls?: readonly { readonly url: string; readonly name?: string }[]
}

export function parseSwaggerConfig(json: string, baseUrl: string): SwaggerConfig {
  const raw = JSON.parse(json) as Record<string, unknown>
  const result: { url?: string; urls?: { url: string; name?: string }[] } = {}

  if (typeof raw.url === 'string') {
    result.url = resolveUrl(raw.url, baseUrl)
  }

  if (Array.isArray(raw.urls)) {
    result.urls = raw.urls
      .filter((entry): entry is Record<string, unknown> => entry != null && typeof entry === 'object')
      .filter((entry) => typeof entry.url === 'string')
      .map((entry) => ({
        url: resolveUrl(entry.url as string, baseUrl),
        name: typeof entry.name === 'string' ? entry.name : undefined,
      }))
  }

  return result
}

export function resolveSpecUrlFromConfig(config: SwaggerConfig): string | null {
  if (config.url) return config.url
  if (config.urls && config.urls.length > 0) return config.urls[0].url
  return null
}
