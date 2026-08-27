import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Clamps a whole block of content to a fixed height so cards with wildly
// different amounts of data (some people/companies have every section
// filled, others almost none) still read as the same size in the carousel —
// only shows "Show more" when the content actually overflows that height.
export function ClampBox({ maxHeight = 280, className, children }) {
  const ref = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setOverflowing(el.scrollHeight > maxHeight + 1)
  }, [children, maxHeight])

  return (
    <div className={cn('relative', className)}>
      <div
        ref={ref}
        style={{ maxHeight: expanded ? undefined : maxHeight }}
        className="relative overflow-hidden"
      >
        {children}
        {!expanded && overflowing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="relative mt-1 flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn('size-3 transition-transform', expanded && 'rotate-180')} />
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

// Shows the first `max` items; clicking "+N more" reveals the rest inside a
// capped, independently scrollable area so the card itself never grows.
export function ExpandableList({ items, max, renderItem }) {
  const [expanded, setExpanded] = useState(false)
  const overflow = items.length - max
  const visible = expanded ? items : items.slice(0, max)

  return (
    <>
      <ul className={cn('space-y-2', expanded && 'max-h-40 overflow-y-auto pr-1')}>
        {visible.map(renderItem)}
      </ul>
      {overflow > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 pl-2.5 text-[10px] text-muted-foreground hover:text-foreground hover:underline"
        >
          {expanded ? 'Show less' : `+${overflow} more`}
        </button>
      )}
    </>
  )
}

export function ExpandableBadges({ items, max }) {
  const [expanded, setExpanded] = useState(false)
  const overflow = items.length - max
  const visible = expanded ? items : items.slice(0, max)

  return (
    <div>
      <div className={cn('flex flex-wrap gap-1', expanded && 'max-h-24 overflow-y-auto pr-1')}>
        {visible.map((s) => (
          <Badge key={s} variant="secondary" className="rounded-md px-1.5 py-0 text-[10px] font-normal">
            {s}
          </Badge>
        ))}
        {!expanded && overflow > 0 && (
          <Badge
            asChild
            variant="outline"
            className="cursor-pointer rounded-md px-1.5 py-0 text-[10px] font-normal hover:bg-accent"
          >
            <button type="button" onClick={() => setExpanded(true)}>
              +{overflow}
            </button>
          </Badge>
        )}
      </div>
      {expanded && overflow > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-[10px] text-muted-foreground hover:text-foreground hover:underline"
        >
          Show less
        </button>
      )}
    </div>
  )
}
