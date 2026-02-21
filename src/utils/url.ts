export function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://')
}

export function resolveUrl(relative: string, base: string): string {
  if (isUrl(relative)) return relative
  try {
    return new URL(relative, new URL(base)).toString()
  } catch {
    throw new Error(`Cannot resolve URL "${relative}" against base "${base}"`)
  }
}
