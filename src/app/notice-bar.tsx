import { useSessionStore } from '../features/persistence/session-storage.ts'
import { cx } from '../shared/ui/cx.ts'
import { useNoticeStore } from './notice-store.ts'

export function NoticeBar() {
  const message = useNoticeStore((state) => state.message)
  const tone = useNoticeStore((state) => state.tone)
  const clear = useNoticeStore((state) => state.clear)
  const storageError = useSessionStore((state) => state.error)

  const text = storageError !== null ? storageError : message
  if (text === null) return null

  return (
    <button
      type="button"
      onClick={clear}
      className={cx(
        'w-full px-3 py-1.5 text-left text-xs',
        tone === 'error' || storageError !== null
          ? 'bg-rose-500/15 text-rose-200'
          : 'bg-teal-500/15 text-teal-200',
      )}
    >
      {text}
    </button>
  )
}
