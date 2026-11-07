import { useEffect, useRef } from 'react'
import { IconClose } from './icons'

/**
 * A side drawer on the reading side (the right, in Arabic), built on the native modal dialog:
 * the page behind it is inert, focus stays inside, Escape and the backdrop close it, and so
 * does a swipe back towards the edge.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const swipe = useRef<{ x: number; y: number; dx: number; on: boolean } | null>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const panel = () => ref.current
  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      // the dialog box is the panel itself; a click landing on the dialog element is the backdrop
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onTouchStart={(e) => {
        const t = e.touches[0]!
        swipe.current = { x: t.clientX, y: t.clientY, dx: 0, on: false }
      }}
      onTouchMove={(e) => {
        const s = swipe.current
        const t = e.touches[0]
        if (!s || !t) return
        s.dx = Math.max(0, t.clientX - s.x)
        // only a mostly horizontal swipe towards the edge moves the drawer
        if (!s.on && s.dx > 10 && s.dx > Math.abs(t.clientY - s.y)) s.on = true
        if (s.on) panel()?.style.setProperty('translate', `${s.dx}px 0`)
      }}
      onTouchEnd={() => {
        const s = swipe.current
        swipe.current = null
        panel()?.style.removeProperty('translate')
        if (s?.on && s.dx > 70) onClose()
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-gold/15 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <span className="font-display text-xl font-bold text-gold">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="grid size-11 place-items-center rounded-full text-mist active:bg-gold/15 hover:text-vellum"
          >
            <IconClose />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] scrollbar-thin">
          {children}
        </div>
      </div>
    </dialog>
  )
}
