const STORAGE_KEY = 'lrc-tap:view'
/** The playhead ticks every frame, so writes are throttled rather than debounced. */
const WRITE_INTERVAL_MS = 1000

export type ViewState = {
  playheadMs: number
  /** Width of the waveform's detail view. */
  spanMs: number
  /** Centre of the detail view while not following the playhead. */
  centerMs: number
  mode: 'edit' | 'preview'
}

/** One guard per field: a stored value only survives if it still has the right shape. */
const VALIDATORS: { [Key in keyof ViewState]: (value: unknown) => value is ViewState[Key] } = {
  playheadMs: isFiniteNumber,
  spanMs: isFiniteNumber,
  centerMs: isFiniteNumber,
  mode: isMode,
}

let pending: Partial<ViewState> = {}
let lastWriteAt = 0
let writeTimer: ReturnType<typeof setTimeout> | null = null

export function readViewState(): Partial<ViewState> {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return {}

  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return {}

    const stored: Partial<ViewState> = {}
    for (const key of viewStateKeys()) collectField({ into: stored, from: parsed, key })
    return stored
  } catch {
    return {}
  }
}

/** Merges a change into the stored view, writing at most once per interval. */
export function saveViewState({ patch }: { patch: Partial<ViewState> }): void {
  pending = { ...pending, ...patch }

  if (writeTimer !== null) return
  const sinceLastWrite = Date.now() - lastWriteAt
  if (sinceLastWrite >= WRITE_INTERVAL_MS) {
    flushViewState()
    return
  }

  writeTimer = setTimeout(() => {
    writeTimer = null
    flushViewState()
  }, WRITE_INTERVAL_MS - sinceLastWrite)
}

/** Writes whatever is queued right away — used as the tab goes away. */
export function flushViewState(): void {
  if (Object.keys(pending).length === 0) return

  lastWriteAt = Date.now()
  const merged = { ...readViewState(), ...pending }
  pending = {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
}

function collectField<Key extends keyof ViewState>({
  into,
  from,
  key,
}: {
  into: Partial<ViewState>
  from: object
  key: Key
}): void {
  const value: unknown = Reflect.get(from, key)
  if (VALIDATORS[key](value)) into[key] = value
}

function viewStateKeys(): (keyof ViewState)[] {
  return Object.keys(VALIDATORS).filter(isViewStateKey)
}

function isViewStateKey(key: string): key is keyof ViewState {
  return key in VALIDATORS
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isMode(value: unknown): value is ViewState['mode'] {
  return value === 'edit' || value === 'preview'
}
