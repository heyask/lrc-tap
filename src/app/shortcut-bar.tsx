import { ALT_LABEL, SHORTCUT } from '../shared/keyboard/shortcut-map.ts'

const SHORTCUTS = [
  { keys: SHORTCUT.playPause, action: 'Play / pause' },
  { keys: SHORTCUT.tagLine, action: 'Tag this line and move on' },
  { keys: SHORTCUT.addLine, action: 'Add a line below and type it' },
  { keys: SHORTCUT.stepBack, action: 'Undo last tag and jump back' },
  { keys: SHORTCUT.moveCursor, action: 'Move line cursor' },
  { keys: SHORTCUT.extendSelection, action: 'Select a range' },
  { keys: SHORTCUT.moveLine, action: 'Move line(s) up / down' },
  { keys: SHORTCUT.seek, action: `Seek 3s (⇧ 1s · ${ALT_LABEL} 10s)` },
  {
    keys: `${SHORTCUT.nudgeBack} ${SHORTCUT.nudgeForward}`,
    action: `Nudge 10ms (⇧ 100ms · ${ALT_LABEL} 500ms)`,
  },
  { keys: SHORTCUT.nextUntagged, action: 'Next untagged line' },
  { keys: SHORTCUT.toggleSkimming, action: 'Skim on hover' },
  { keys: SHORTCUT.stop, action: 'Stop' },
  { keys: SHORTCUT.undo, action: 'Undo' },
  { keys: SHORTCUT.download, action: 'Download .lrc' },
]

export function ShortcutBar() {
  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-500">
      {SHORTCUTS.map((shortcut) => (
        <span key={shortcut.keys} className="flex items-center gap-1.5">
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-300">
            {shortcut.keys}
          </kbd>
          {shortcut.action}
        </span>
      ))}
    </footer>
  )
}
