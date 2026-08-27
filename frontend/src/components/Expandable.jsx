import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
