import { useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUp, Loader2, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function SearchBar({ url, setUrl, file, setFile, onSubmit, busy, docked }) {
  const fileInput = useRef(null)
  const reduced = useReducedMotion()
  const canSubmit = !busy && (file || url.trim())

  function submit(e) {
    e.preventDefault()
    if (canSubmit) onSubmit()
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div
        className={cn(
          'rounded-2xl border bg-card shadow-sm transition-shadow duration-200',
          'focus-within:shadow-md focus-within:border-ring/60',
        )}
      >
        <div className="flex items-center gap-2 p-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            placeholder={docked ? 'Another profile…' : 'Paste a LinkedIn profile URL'}
            className="h-10 border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          />
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            title="Attach .csv or .txt"
            onClick={() => fileInput.current.click()}
            className="text-muted-foreground active:scale-97"
          >
            <Paperclip />
          </Button>
          <Button
            type="submit"
            size="icon-sm"
            disabled={!canSubmit}
            className="rounded-full active:scale-97"
          >
            {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {file && (
            <motion.div
              initial={{ height: 0, opacity: 0, filter: reduced ? 'none' : 'blur(4px)' }}
              animate={{ height: 'auto', opacity: 1, filter: 'blur(0px)' }}
              exit={{ height: 0, opacity: 0, filter: reduced ? 'none' : 'blur(4px)' }}
              transition={{ duration: reduced ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
                <Paperclip className="size-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-auto rounded p-0.5 transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}
