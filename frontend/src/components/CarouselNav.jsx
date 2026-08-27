import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Adapted from Watermelon UI's carousel-navigator (registry.watermelon.sh)
// button/pill layout — restyled to this app's monochrome theme and driven by
// plain index state instead of autoplay, since we're paging through fetched
// profiles rather than a slideshow.
export default function CarouselNav({ index, total, onChange }) {
  if (total <= 1) return null

  return (
    <div className="flex items-center justify-center gap-1 rounded-full border bg-card p-1 shadow-sm">
      <ArrowButton
        onClick={() => onChange(Math.max(0, index - 1))}
        disabled={index === 0}
        label="Previous profile"
      >
        <ChevronLeft className="size-4" />
      </ArrowButton>

      <span className="min-w-14 text-center font-mono text-[11px] tabular-nums text-muted-foreground">
        {index + 1} / {total}
      </span>

      <ArrowButton
        onClick={() => onChange(Math.min(total - 1, index + 1))}
        disabled={index === total - 1}
        label="Next profile"
      >
        <ChevronRight className="size-4" />
      </ArrowButton>
    </div>
  )
}

function ArrowButton({ children, onClick, disabled, label }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      className={cn(
        'flex size-8 items-center justify-center rounded-full transition-colors',
        disabled ? 'text-muted-foreground/40' : 'text-foreground hover:bg-accent',
      )}
    >
      {children}
    </motion.button>
  )
}
