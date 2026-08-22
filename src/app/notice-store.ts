import { create } from 'zustand'

type Notice = {
  message: string | null
  tone: 'info' | 'error'
}

type NoticeState = Notice & {
  show: (input: { message: string; tone?: 'info' | 'error' }) => void
  clear: () => void
}

let hideTimer: ReturnType<typeof setTimeout> | null = null

/** Transient messages shown under the header — drop errors, copy confirmations. */
export const useNoticeStore = create<NoticeState>()((set) => ({
  message: null,
  tone: 'info',

  show: ({ message, tone = 'info' }) => {
    if (hideTimer !== null) clearTimeout(hideTimer)
    set({ message, tone })
    hideTimer = setTimeout(() => set({ message: null }), 5000)
  },

  clear: () => {
    if (hideTimer !== null) clearTimeout(hideTimer)
    set({ message: null })
  },
}))
