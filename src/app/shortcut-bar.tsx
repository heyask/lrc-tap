const SHORTCUTS = [
  { keys: 'Space', action: 'Play, then tap each line' },
  { keys: '⌫', action: 'Undo last tap and jump back' },
  { keys: '↑ ↓', action: 'Move line cursor' },
  { keys: '⇧ ↑ ↓', action: 'Select a range' },
  { keys: '← →', action: 'Seek 3s (⇧ 1s · ⌥ 10s)' },
  { keys: '[ ]', action: 'Nudge 10ms (⇧ 100ms)' },
  { keys: 'Tab', action: 'Next untagged line' },
  { keys: 'P', action: 'Play / pause' },
  { keys: 'Esc', action: 'Stop' },
  { keys: '⌘Z', action: 'Undo' },
  { keys: '⌘S', action: 'Download .lrc' },
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
