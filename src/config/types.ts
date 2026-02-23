import type { ResponseTab } from '@/types/http.js'
import type { AuthCredentials } from '@/types/auth.js'

export type SavedAuth = Exclude<AuthCredentials, { method: 'none' }>

export interface SavedServer {
  readonly name: string
  readonly url: string
  readonly auth?: SavedAuth
}

export interface Preferences {
  readonly defaultResponseTab: ResponseTab
}

export interface ConfigData {
  readonly servers: readonly SavedServer[]
  readonly preferences: Preferences
}

export const DEFAULT_PREFERENCES: Preferences = {
  defaultResponseTab: 'pretty',
}

export const DEFAULT_CONFIG: ConfigData = {
  servers: [],
  preferences: DEFAULT_PREFERENCES,
}
