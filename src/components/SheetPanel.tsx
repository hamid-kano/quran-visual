import { useRef, useState, type ReactNode } from 'react'

/**
 * Detail panel beside a map. On wide screens it is a column on the left; on a phone it is a
 * sheet over the lower part of the map that can be raised to full height by its handle
 * (tap, or drag up and down).
 */
export function SheetPanel({ label, children }: { label: string; children: ReactNode }) {
  const [tall, setTall] = useState(false)
  const startY = useRef<number | null>(null)
  return (
    <aside
      aria-label={label}
      className={`absolute inset-x-2 bottom-2 z-20 transition-[height] duration-200 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:top-5 sm:h-auto sm:w-[27rem] ${
        tall ? 'h-[calc(100%-1rem)]' : 'h-[58%]'
      }`}
    >
      <button
        type="button"
        aria-expanded={tall}
        aria-label={tall ? 'تصغير اللوحة' : 'توسيع اللوحة'}
        onClick={() => setTall((v) => !v)}
        onPointerDown={(e) => (startY.current = e.clientY)}
        onPointerUp={(e) => {
          if (startY.current === null) return
          const dy = e.clientY - startY.current
          startY.current = null
          if (dy < -24) setTall(true)
          else if (dy > 24) setTall(false)
        }}
        className="absolute inset-x-0 top-0 z-10 mx-auto grid h-9 w-28 touch-none place-items-center sm:hidden"
      >
        <span className="block h-1 w-10 rounded-full bg-[#b99d5c]" aria-hidden />
      </button>
      {children}
    </aside>
  )
}
