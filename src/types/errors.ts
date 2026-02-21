export class SpecLoadError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = 'SpecLoadError'
  }
}

export class SpecParseError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: readonly string[] = [],
    cause?: unknown,
  ) {
    const fullMessage =
      validationErrors.length > 0 ? `${message}:\n  - ${validationErrors.join('\n  - ')}` : message
    super(fullMessage, cause !== undefined ? { cause } : undefined)
    this.name = 'SpecParseError'
  }
}
