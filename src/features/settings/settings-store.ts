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
}

const DEFAULTS: Settings = {
  tapOffsetMs: 0,
  auditionOnSelect: true,
  followPlayhead: true,
}

type SettingsState = Settings & {
  update: (input: { patch: Partial<Settings> }) => void
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...DEFAULTS,
  ...readStoredSettings(),

  update: ({ patch }) => {
    set(patch)
    const { tapOffsetMs, auditionOnSelect, followPlayhead } = get()
    writeStoredSettings({ settings: { tapOffsetMs, auditionOnSelect, followPlayhead } })
  },
}))

function readStoredSettings(): Partial<Settings> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return {}

  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return {}

    const stored: Partial<Settings> = {}
    if ('tapOffsetMs' in parsed && typeof parsed.tapOffsetMs === 'number') {
      stored.tapOffsetMs = parsed.tapOffsetMs
    }
    if ('auditionOnSelect' in parsed && typeof parsed.auditionOnSelect === 'boolean') {
      stored.auditionOnSelect = parsed.auditionOnSelect
    }
    if ('followPlayhead' in parsed && typeof parsed.followPlayhead === 'boolean') {
      stored.followPlayhead = parsed.followPlayhead
    }
    return stored
  } catch {
    return {}
  }
}

function writeStoredSettings({ settings }: { settings: Settings }): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
