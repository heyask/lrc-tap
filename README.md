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

A strip above the waveform shows what a player would be displaying right now —
the line before, the current one, and what is coming — with a bar filling to the
next timestamp. Lines out of order? Grab the grip in the left margin and drag,
or press `⌥↑` / `⌥↓`; the timestamps travel with the words.

## Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause — starts at the skimmer when hovering the waveform |
| `Enter` | Tag the current line and move to the next — works while paused |
| `Backspace` | Undo the last tag, clear it and rewind to it |
| `↑` `↓` | Move the line cursor (`⇧` extends the selection) |
| `⌥↑` `⌥↓` | Move the selected line(s) up or down |
| `←` `→` | Seek 3s (`⇧` 1s, `⌥` 10s) |
| `[` `]` | Nudge the selection by 10ms (`⇧` 100ms, `⌥` 500ms) |
| `Tab` | Jump to the next line without a timestamp |
| `S` | Turn waveform skimming on or off |
| `Esc` | Stop, and leave re-sync mode |
| `⌘Z` / `⌘⇧Z` | Undo / redo |
| `⌘S` | Download the `.lrc` |
| `⌘A` | Select every line |

Buttons carry their own key: the main ones print it, the rest show it on hover.

On the waveform: just hovering skims. A dashed marker follows the pointer and,
while the track is paused, plays the audio under it — so you can find where a
line starts without clicking anything. The playhead stays put until you click,
and pressing `Space` while skimming starts playback from the marker rather than
from the playhead. `S` turns skimming off.

Dragging pauses playback and scrubs instead: the further you drag, the further
it plays, so a line can be placed by ear. Drag a marker to move that line, `⌥`-drag to
pan, `⌃`-scroll to zoom. "Hear the audio while dragging" silences both if you
would rather work without sound.

## Formats

Reads `.lrc` (timestamps and standard tags preserved) and plain `.txt`, or
paste lyrics straight in. Audio is whatever your browser decodes — MP3, M4A,
OGG, WAV, FLAC. Exports standard line-level `[mm:ss.xx]` LRC; lines you haven't
tagged yet are written without a timestamp so a draft round-trips intact.

Your track, lyrics and timestamps are kept in IndexedDB, so a reload picks up
exactly where you left off — the same line selected and scrolled to, the same
playback position, the same waveform zoom. **Start over** in the export panel
clears them.

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
