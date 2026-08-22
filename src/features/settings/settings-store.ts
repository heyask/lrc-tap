import { create } from 'zustand'

const STORAGE_KEY = 'lrc-tap:settings'

export type Settings = {
  /**
   * Subtracted from the playhead when tapping, to cancel out human reaction
   * delay. Positive values move tags earlier.
   */
  tapOffsetMs: number
  /** Clicking a tagged line plays just that line instead of only seeking. */
  auditionOnSelect: boolean
  /** Keep the waveform and lyric list centred on the playhead during playback. */
  followPlayhead: boolean
  /** Show the subtitle strip above the waveform. */
  showSubtitleStrip: boolean
  /** Play the audio under the pointer while dragging on the waveform. */
  scrubAudio: boolean
}

const DEFAULTS: Settings = {
  tapOffsetMs: 0,
  auditionOnSelect: true,
  followPlayhead: true,
  showSubtitleStrip: true,
  scrubAudio: true,
}

/** One entry per setting: the guard that decides whether a stored value is usable. */
const VALIDATORS: { [Key in keyof Settings]: (value: unknown) => value is Settings[Key] } = {
  tapOffsetMs: isNumber,
  auditionOnSelect: isBoolean,
  followPlayhead: isBoolean,
  showSubtitleStrip: isBoolean,
  scrubAudio: isBoolean,
}

type SettingsState = Settings & {
  update: (input: { patch: Partial<Settings> }) => void
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...DEFAULTS,
  ...readStoredSettings(),

  update: ({ patch }) => {
    set(patch)
    writeStoredSettings({ state: get() })
  },
}))

function readStoredSettings(): Partial<Settings> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return {}

  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return {}

    const stored: Partial<Settings> = {}
    for (const key of settingKeys()) {
      if (!(key in parsed)) continue
      collectSetting({ stored, parsed, key })
    }
    return stored
  } catch {
    return {}
  }
}

function writeStoredSettings({ state }: { state: Settings }): void {
  const settings: Partial<Settings> = {}
  for (const key of settingKeys()) collectSetting({ stored: settings, parsed: state, key })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

/**
 * Copies one setting across only when it passes its own guard. Written
 * generically so that adding a setting means adding a single validator entry.
 */
function collectSetting<Key extends keyof Settings>({
  stored,
  parsed,
  key,
}: {
  stored: Partial<Settings>
  parsed: object
  key: Key
}): void {
  const value: unknown = Reflect.get(parsed, key)
  if (VALIDATORS[key](value)) stored[key] = value
}

function settingKeys(): (keyof Settings)[] {
  return Object.keys(VALIDATORS).filter(isSettingKey)
}

function isSettingKey(key: string): key is keyof Settings {
  return key in VALIDATORS
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}
