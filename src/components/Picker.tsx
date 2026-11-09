import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { IconCheck, IconChevronDown, IconSearch } from './icons'
import { normalizeArabic } from '../lib/arabic'
import type { PickerOption } from '../lib/picker'

/** Western digits, for searching by number whichever digits are typed. */
const westernDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
const searchable = (s: string) => westernDigits(normalizeArabic(s))

/**
 * A choice among many, in the site's own style: a button showing the choice, opening a list
 * with a search field. It opens under the button on a large screen, and as a sheet from the
 * bottom on a phone. The search field is a combobox: the arrow keys move through the list,
 * Enter chooses, Escape closes, as the ARIA pattern for a combobox with a listbox prescribes.
 */
export function Picker({
  label,
  value,
  options,
  onChange,
  placeholder = 'ابحث',
}: {
  /** What is chosen (read to screen readers and shown as the sheet's title). */
  label: string
  value: string
  options: PickerOption[]
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const current = options.find((o) => o.value === value)

  const show = () => {
    // a phone gets the sheet; a pointer and a wide screen get the list under the button
    setSheet(
      window.matchMedia('(max-width: 639px), (pointer: coarse) and (max-width: 1023px)').matches,
    )
    setOpen(true)
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }
  const choose = (v: string) => {
    onChange(v)
    close()
  }

  return (
    <div className="relative min-w-0 flex-1">
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label ?? ''}`}
        onClick={() => (open ? close() : show())}
        className="tap flex h-11 w-full items-center gap-2 rounded-full border border-gold/30 bg-night-deep/60 pe-3 ps-5 text-start text-vellum hover:border-gold/50 focus-visible:border-gold/70"
      >
        <span className="min-w-0 flex-1 truncate">
          {current?.lead && <span className="me-1.5 text-mist">{current.lead}</span>}
          {current?.label}
        </span>
        <IconChevronDown
          className={`size-5 shrink-0 text-gold-soft transition-transform ${open && !sheet ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !sheet && (
        <Popover onClose={close} button={button}>
          <List
            label={label}
            options={options}
            value={value}
            onChoose={choose}
            onClose={close}
            placeholder={placeholder}
            maxHeight="min(22rem, 60dvh)"
            focusSearch
          />
        </Popover>
      )}
      <BottomSheet
        open={open && sheet}
        onClose={() => close(false)}
        label={label}
        header={
          <p className="px-4 pb-2 pt-1 font-display text-xl font-bold text-gold-soft">{label}</p>
        }
      >
        {open && sheet && (
          <div className="px-3">
            <List
              label={label}
              options={options}
              value={value}
              onChoose={choose}
              onClose={() => close(false)}
              placeholder={placeholder}
            />
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

/** The list under the button: closes on a click outside it or the button. */
function Popover({
  onClose,
  button,
  children,
}: {
  onClose: (refocus?: boolean) => void
  button: React.RefObject<HTMLButtonElement | null>
  children: React.ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      const t = e.target as Node
      if (!box.current?.contains(t) && !button.current?.contains(t)) onClose(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [onClose, button])
  return (
    <div
      ref={box}
      className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-gold/25 bg-night-deep p-2 shadow-[0_16px_40px_rgb(0_0_0/0.5)]"
    >
      {children}
    </div>
  )
}

function List({
  label,
  options,
  value,
  onChoose,
  onClose,
  placeholder,
  maxHeight,
  focusSearch = false,
}: {
  label: string
  options: PickerOption[]
  value: string
  onChoose: (v: string) => void
  onClose: () => void
  placeholder: string
  maxHeight?: string
  /** Put the cursor in the search field (not on a phone, where the keyboard would cover the list). */
  focusSearch?: boolean
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const list = useMemo(() => {
    const q = searchable(query.trim())
    return q
      ? options.filter((o) =>
          searchable(`${o.lead ?? ''} ${o.label} ${o.keywords ?? ''}`).includes(q),
        )
      : options
  }, [options, query])
  // the highlighted option: the chosen one at first, then wherever the keys move it
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  )
  const at = Math.min(active, Math.max(0, list.length - 1))
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${at}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [at, list])

  const onKey = (e: React.KeyboardEvent) => {
    const last = list.length - 1
    const move = (i: number) => {
      e.preventDefault()
      setActive(Math.max(0, Math.min(last, i)))
    }
    if (e.key === 'ArrowDown') move(at + 1)
    else if (e.key === 'ArrowUp') move(at - 1)
    else if (e.key === 'PageDown') move(at + 8)
    else if (e.key === 'PageUp') move(at - 8)
    else if (e.key === 'Enter') {
      e.preventDefault()
      const o = list[at]
      if (o) onChoose(o.value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">{`ابحث في ${label}`}</span>
        <IconSearch className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-mist" />
        <input
          type="search"
          role="combobox"
          aria-expanded
          aria-controls={`${id}-list`}
          aria-activedescendant={list[at] ? `${id}-${at}` : undefined}
          aria-autocomplete="list"
          autoFocus={focusSearch}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="h-11 w-full rounded-full border border-gold/25 bg-night pe-3 ps-10 text-vellum placeholder:text-mist/70 focus:border-gold/60 focus:outline-none"
        />
      </label>
      <ul
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-label={label}
        className="mt-2 overflow-y-auto overscroll-contain"
        style={{ maxHeight }}
      >
        {list.map((o, i) => {
          const chosen = o.value === value
          const head = o.group && o.group !== list[i - 1]?.group
          return (
            <li key={o.value} role="presentation">
              {head && (
                <p
                  role="presentation"
                  className="px-3 pb-1 pt-3 text-xs font-semibold text-mist/70 first:pt-1"
                >
                  {o.group}
                </p>
              )}
              <div
                id={`${id}-${i}`}
                data-i={i}
                role="option"
                aria-selected={chosen}
                onPointerMove={() => i !== at && setActive(i)}
                onClick={() => onChoose(o.value)}
                className={`tap flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 ${
                  i === at ? 'bg-white/[0.07]' : ''
                } ${chosen ? 'font-semibold text-gold-soft' : 'text-vellum'}`}
              >
                {o.lead && (
                  <span className="w-7 shrink-0 text-center text-sm tabular-nums text-mist">
                    {o.lead}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {chosen && <IconCheck className="size-5 shrink-0 text-gold-soft" />}
              </div>
            </li>
          )
        })}
        {list.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-mist">لا نتيجة لـ«{query}».</li>
        )}
      </ul>
    </div>
  )
}
