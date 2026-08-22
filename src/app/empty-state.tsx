export function EmptyState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h2 className="text-lg font-medium text-zinc-200">Drop a track and its lyrics</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Drag an audio file and a .lrc or .txt anywhere on this page, or use the panel on the
          right. Everything stays in your browser.
        </p>
      </div>

      <ol className="w-full max-w-md space-y-2 text-left text-sm text-zinc-400">
        <Step number={1} text="Load the audio and paste the lyrics." />
        <Step number={2} text="Press Space to play, then Enter on every line as it is sung." />
        <Step number={3} text="Missed one? Backspace steps back, clears it and rewinds." />
        <Step number={4} text="Enter works while paused too — park the playhead and tag." />
        <Step number={5} text="Fix a line with [ and ] or by dragging its waveform marker." />
        <Step number={6} text="Select a range and hit Re-sync to redo just that part." />
      </ol>
    </div>
  )
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-mono text-xs text-teal-300">
        {number}
      </span>
      {text}
    </li>
  )
}
