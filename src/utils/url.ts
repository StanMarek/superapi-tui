export function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://')
}

export function resolveUrl(relative: string, base: string): string {
  if (isUrl(relative)) return relative
  const baseUrl = new URL(base)
  return new URL(relative, baseUrl).toString()
}
