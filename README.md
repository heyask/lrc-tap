# LRC Tap

A browser-only editor for syncing lyrics to audio and exporting `.lrc` files.
Drop in a track and its words, tap along, fix what's off, download the result.
Nothing is uploaded — the audio never leaves your machine.

## The three things it optimises for

**First pass.** `Space` plays, `Enter` tags. Hit `Enter` on every line as it is
sung — the cursor advances on its own and skips blank spacers. `Enter` works
while paused too, so you can park the playhead and stamp a line by hand.

**Missed one.** `Backspace` steps the cursor back, clears that timestamp and
jumps playback to where it was, so you can retake it immediately.

**Fixing one line.** Nudge with `[` and `]`, drag its marker on the waveform, or
click the timestamp and type it. Select a range and hit **Re-sync** to re-tap
just that stretch — every line outside the range is left exactly as it was.

## Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `Enter` | Tag the current line and move to the next — works while paused |
| `Backspace` | Undo the last tag, clear it and rewind to it |
| `↑` `↓` | Move the line cursor (`⇧` extends the selection) |
| `←` `→` | Seek 3s (`⇧` 1s, `⌥` 10s) |
| `[` `]` | Nudge the selection by 10ms (`⇧` 100ms, `⌥` 500ms) |
| `Tab` | Jump to the next line without a timestamp |
| `Esc` | Stop, and leave re-sync mode |
| `⌘Z` / `⌘⇧Z` | Undo / redo |
| `⌘S` | Download the `.lrc` |
| `⌘A` | Select every line |

Buttons carry their own key: the main ones print it, the rest show it on hover.

On the waveform: click anywhere to seek without interrupting playback, drag a
marker to move that line, `⌥`-drag to pan, `⌃`-scroll to zoom. Dragging pauses
as soon as it starts so you can hear exactly where you are landing.

## Formats

Reads `.lrc` (timestamps and standard tags preserved) and plain `.txt`, or
paste lyrics straight in. Audio is whatever your browser decodes — MP3, M4A,
OGG, WAV, FLAC. Exports standard line-level `[mm:ss.xx]` LRC; lines you haven't
tagged yet are written without a timestamp so a draft round-trips intact.

Your track, lyrics and timestamps are kept in IndexedDB, so a reload picks up
exactly where you left off. **Start over** in the export panel clears them.

## Development

```sh
bun install
bun run dev        # http://localhost:3100
bun test
bun run lint
bun run build
```

Vite + React + TypeScript + Tailwind. The waveform is drawn straight onto a
canvas from peaks decoded with the Web Audio API — no audio libraries.

## Deploying

Pushing to `main` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`; enable Pages with the **GitHub Actions** source
in the repository settings. The build uses relative asset paths, so it works
from any repository name or a custom domain without configuration.

## License

MIT
