import { useId, useMemo, useState } from 'react'
import { normalizeArabic } from '../lib/arabic'

export interface SearchItem {
  key: string
  label: string
  hint?: string
  /** Extra strings that should match (numbers, transliteration, …). */
  terms: string[]
}

/** Accessible combobox: type, move with arrows, choose with Enter. */
export function SearchBox({
  items,
  placeholder,
  label,
  onChoose,
  limit = 8,
}: {
  items: SearchItem[]
  placeholder: string
  label: string
  onChoose: (key: string) => void
  limit?: number
}) {
  const id = useId()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  const indexed = useMemo(
    () =>
      items.map((it) => ({
        it,
        hay: [it.label, ...it.terms].map(normalizeArabic).join(' ').toLowerCase(),
      })),
    [items],
  )
  const results = useMemo(() => {
    const needle = normalizeArabic(q).toLowerCase()
    if (!needle) return []
    const starts: SearchItem[] = []
    const contains: SearchItem[] = []
    for (const { it, hay } of indexed) {
      if (hay.split(' ').some((w) => w.startsWith(needle))) starts.push(it)
      else if (hay.includes(needle)) contains.push(it)
    }
    return [...starts, ...contains].slice(0, limit)
  }, [q, indexed, limit])

  const choose = (key: string) => {
    onChoose(key)
    setQ('')
    setOpen(false)
  }

  const expanded = open && results.length > 0
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-activedescendant={expanded ? `${id}-${active}` : undefined}
        autoComplete="off"
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!expanded) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => (a + 1) % results.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => (a - 1 + results.length) % results.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const r = results[active]
            if (r) choose(r.key)
          } else if (e.key === 'Escape') setOpen(false)
        }}
        className="w-full rounded-full border border-gold/30 bg-night-deep/80 px-4 py-2 text-vellum placeholder:text-mist/70 focus:border-gold/70 focus:outline-none"
      />
      {expanded && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gold/25 bg-night-deep/95 shadow-xl backdrop-blur"
        >
          {results.map((r, i) => (
            <li
              key={r.key}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(r.key)
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2 ${
                i === active ? 'bg-gold/15 text-gold-soft' : 'text-vellum'
              }`}
            >
              <span className="font-medium">{r.label}</span>
              {r.hint && <span className="text-sm text-mist">{r.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
