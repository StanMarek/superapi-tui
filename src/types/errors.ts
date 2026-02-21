export class SpecLoadError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'SpecLoadError'
  }
}

export class SpecParseError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: string[] = [],
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'SpecParseError'
  }
}
