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
  /["']?(https?:\/\/[^"'\s]*(?:api-docs|swagger|openapi)[^"'\s]*)["']?/,
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
