/** How far `←` / `→` move the playhead, by modifier. */
export const SEEK_STEP_MS = {
  normal: 3000,
  fine: 1000,
  coarse: 10_000,
} as const

/**
 * How far `[` / `]` move the selected timestamps, by modifier. The three tiers
 * are the single source for both the keyboard map and the nudge buttons, so a
 * button and its shortcut always move by the same amount.
 */
export const NUDGE_STEP_MS = {
  fine: 10,
  medium: 100,
  coarse: 500,
} as const

const isApplePlatform = /Mac|iPhone|iPad/.test(navigator.userAgent)

export const MOD_LABEL = isApplePlatform ? '⌘' : 'Ctrl'
export const ALT_LABEL = isApplePlatform ? '⌥' : 'Alt'
const SHIFT_LABEL = '⇧'

/** Key labels shown on buttons, in tooltips and in the shortcut bar. */
export const SHORTCUT = {
  playPause: 'Space',
  tagLine: 'Enter',
  stepBack: '⌫',
  moveCursor: '↑ ↓',
  extendSelection: `${SHIFT_LABEL}↑ ${SHIFT_LABEL}↓`,
  seekBack: '←',
  seekForward: '→',
  seek: '← →',
  nudgeBack: '[',
  nudgeForward: ']',
  nudgeBackMedium: `${SHIFT_LABEL}[`,
  nudgeForwardMedium: `${SHIFT_LABEL}]`,
  nudgeBackCoarse: `${ALT_LABEL}[`,
  nudgeForwardCoarse: `${ALT_LABEL}]`,
  nextUntagged: 'Tab',
  stop: 'Esc',
  undo: `${MOD_LABEL}Z`,
  redo: `${MOD_LABEL}${SHIFT_LABEL}Z`,
  selectAll: `${MOD_LABEL}A`,
  download: `${MOD_LABEL}S`,
} as const
