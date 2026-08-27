import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadCsv } from '@/lib/csv'

export default function ExportMenu({ profiles, starredProfiles }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function exportAll() {
    downloadCsv('profiles.csv', profiles)
    setOpen(false)
  }

  function exportStarred() {
    downloadCsv('profiles-starred.csv', starredProfiles)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="size-3.5" />
        Export
        <ChevronDown className="size-3.5" />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, filter: reduced ? 'none' : 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, filter: reduced ? 'none' : 'blur(6px)' }}
            transition={{ duration: reduced ? 0 : 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border bg-popover p-1 shadow-md"
          >
            <button
              type="button"
              role="menuitem"
              onClick={exportAll}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              Export All
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={starredProfiles.length === 0}
              onClick={exportStarred}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Export Starred ({starredProfiles.length})
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
