export type InputType = 'file' | 'url'
export type SpecFormat = 'json' | 'yaml'

export interface LoadResult {
  readonly content: string
  readonly format: SpecFormat
  readonly inputType: InputType
  readonly source: string
  readonly resolvedUrl?: string
}
