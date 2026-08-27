import { useRef } from 'react'
import { ArrowUp, Loader2, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function SearchBar({ url, setUrl, file, setFile, onSubmit, busy, docked }) {
  const fileInput = useRef(null)
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
            value={file ? file.name : url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy || !!file}
            placeholder={docked ? 'Another profile…' : 'Paste a LinkedIn profile URL'}
            className="h-10 border-0 bg-transparent shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
          />
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0] || null
              setFile(f)
              // it's one or the other, not both
              if (f) setUrl('')
            }}
          />
          {file ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              title="Remove attached file"
              onClick={() => setFile(null)}
              className="text-muted-foreground active:scale-97"
            >
              <X />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={busy || !!url.trim()}
              title={url.trim() ? 'Clear the URL to attach a file' : 'Attach .csv or .txt'}
              onClick={() => fileInput.current.click()}
              className="text-muted-foreground active:scale-97"
            >
              <Paperclip />
            </Button>
          )}
          <Button
            type="submit"
            size="icon-sm"
            disabled={!canSubmit}
            className="rounded-full active:scale-97"
          >
            {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
      </div>
    </form>
  )
}
