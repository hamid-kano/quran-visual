import { useEffect, useRef } from 'react'

/**
 * A sheet rising from the bottom of the screen, built on the native modal dialog: the page
 * behind it is inert, focus stays inside, Escape and the backdrop close it, and so does a
 * downward drag from its handle or heading. On a wide screen it stands centred, at a phone's width.
 */
export function BottomSheet({
  open,
  onClose,
  label,
  header,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  /** Stays in place above the content, which scrolls. */
  header: React.ReactNode
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // focus the sheet itself, not its first button: no ring on a control nobody chose
      d.querySelector<HTMLElement>('[data-sheet-panel]')?.focus()
    }
    if (!open && d.open) d.close()
  }, [open])

  const panel = () => ref.current
  const grip = {
    onTouchStart: (e: React.TouchEvent) => {
      drag.current = { y: e.touches[0]!.clientY, dy: 0 }
    },
    onTouchMove: (e: React.TouchEvent) => {
      const d = drag.current
      const t = e.touches[0]
      if (!d || !t) return
      d.dy = Math.max(0, t.clientY - d.y)
      panel()?.style.setProperty('translate', `0 ${d.dy}px`)
    },
    onTouchEnd: () => {
      const d = drag.current
      drag.current = null
      panel()?.style.removeProperty('translate')
      if (d && d.dy > 80) onClose()
    },
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div data-sheet-panel tabIndex={-1} className="flex h-full flex-col outline-none">
        <div {...grip} className="shrink-0 touch-none">
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-mist/40" aria-hidden />
          {header}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))] scrollbar-thin">
          {children}
        </div>
      </div>
    </dialog>
  )
}
