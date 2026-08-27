import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, TriangleAlert } from 'lucide-react'

// LinkedIn often 403s a lookup for both a nonexistent AND a private profile
// (likely deliberate — it stops enumeration attacks that watch for 404 vs
// 403 to guess valid usernames), so RESTRICTED doesn't always mean "private"
// specifically — see README "known limitations".
const LABELS = {
  PROFILE_NOT_FOUND: 'Not found',
  PROFILE_RESTRICTED: 'Not accessible',
}

// Collapsed by default — profiles that don't exist or aren't visible are
// skipped from the results list entirely (no point rendering an empty card),
// this is just a quiet heads-up the user can expand to see which ones.
export default function HazardBanner({ items }) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-destructive"
      >
        <TriangleAlert className="size-3.5 shrink-0" />
        <span className="flex-1">
          {items.length} account{items.length === 1 ? '' : 's'} couldn't be loaded
        </span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <ul className="max-h-48 space-y-1.5 overflow-y-auto border-t border-destructive/20 px-3 py-2.5">
              {items.map((item, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-[11px]">
                  <span className="truncate text-destructive/90">{item.url}</span>
                  <span className="shrink-0 font-mono uppercase tracking-wide text-destructive/60">
                    {LABELS[item.reason] || item.reason}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
