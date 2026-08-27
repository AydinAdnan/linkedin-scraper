import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import Passport from '@/components/Passport'
import ExportMenu from '@/components/ExportMenu'
import { Skeleton } from '@/components/ui/skeleton'
import { authStatus, fetchProfile, streamBatch, SessionExpiredError } from '@/api'
import { cn } from '@/lib/utils'

const SESSION_MSG = 'Backend session expired. Ask the admin to re-login on the server.'
const STARRED_KEY = 'starredProfiles'

function rowKey(row) {
  return row.sourceUrl || String(row.row)
}

function ResultsSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Skeleton className="h-28 rounded-none" />
      <div className="px-8 pb-8">
        <div className="-mt-12 flex items-end gap-5">
          <Skeleton className="size-24 rounded-xl border-4 border-card" />
          <div className="flex-1 space-y-2 pb-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Notice({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive"
    >
      <AlertTriangle className="mt-px size-4 shrink-0" />
      <span>{children}</span>
    </motion.div>
  )
}

function loadStarred() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STARRED_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export default function App() {
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(true)
  const [starred, setStarred] = useState(loadStarred)

  const reduced = useReducedMotion()
  const spring = reduced ? { duration: 0 } : { type: 'spring', duration: 0.55, bounce: 0.12 }
  const active = busy || results.length > 0

  useEffect(() => {
    authStatus()
      .then((s) => setLoggedIn(s.loggedIn))
      .catch(() => {}) // backend down shows up on submit instead
  }, [])

  useEffect(() => {
    localStorage.setItem(STARRED_KEY, JSON.stringify([...starred]))
  }, [starred])

  function toggleStar(key) {
    setStarred((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function run() {
    setBusy(true)
    setError('')
    setResults([])
    try {
      if (file) {
        setStreaming(true)
        await streamBatch({ file }, (row) => setResults((r) => [...r, row]))
      } else {
        const data = await fetchProfile(url.trim())
        setResults([{ row: 0, ...data }])
      }
    } catch (e) {
      setError(e instanceof SessionExpiredError ? SESSION_MSG : e.message)
    } finally {
      setBusy(false)
      setStreaming(false)
    }
  }

  const slide = reduced ? 0 : 24

  const starredResults = results.filter((r) => starred.has(rowKey(r)))

  return (
    <div
      className={cn(
        'mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 md:flex-row md:gap-12',
        active ? 'py-10 md:items-start' : 'items-center justify-center py-16',
      )}
    >
      <motion.div
        layout
        transition={spring}
        className={cn(
          'w-full',
          active ? 'md:sticky md:top-10 md:w-[340px] md:shrink-0' : 'max-w-2xl',
        )}
      >
        <AnimatePresence initial={false}>
          {!active && (
            <motion.div
              exit={{ opacity: 0, y: -8, filter: reduced ? 'none' : 'blur(6px)' }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="mb-8 text-center"
            >
              <h1 className="text-3xl font-semibold tracking-tight">LinkedIn Profile API</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Paste a profile URL, or attach a .csv / .txt of up to 50 of them.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <SearchBar
          url={url}
          setUrl={setUrl}
          file={file}
          setFile={setFile}
          onSubmit={run}
          busy={busy}
          docked={active}
        />

        <div className="mt-4 space-y-3">
          <AnimatePresence>
            {error && <Notice key="err">{error}</Notice>}
            {!loggedIn && !error && (
              <Notice key="auth">No LinkedIn session on the backend — requests will fail until the admin logs in.</Notice>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {active && (
        <motion.div
          initial={{ opacity: 0, y: slide, filter: reduced ? 'none' : 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ ...spring, delay: reduced ? 0 : 0.08 }}
          className="min-w-0 flex-1 space-y-6"
        >
          {results.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {results.length} result{results.length === 1 ? '' : 's'}
                {streaming ? ' · fetching…' : ''}
              </p>
              <ExportMenu profiles={results} starredProfiles={starredResults} />
            </div>
          )}

          {busy && results.length === 0 && <ResultsSkeleton />}

          <AnimatePresence initial={false}>
            {results.map((row) => (
              <motion.div
                key={rowKey(row)}
                layout
                initial={{ opacity: 0, y: 12, filter: reduced ? 'none' : 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: reduced ? 'none' : 'blur(8px)' }}
                transition={{ duration: reduced ? 0 : 0.35, ease: [0.23, 1, 0.32, 1] }}
              >
                <Passport
                  profile={row}
                  starred={starred.has(rowKey(row))}
                  onToggleStar={() => toggleStar(rowKey(row))}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {streaming && (
            <motion.div
              key="trailing-skeleton"
              initial={{ opacity: 0, filter: reduced ? 'none' : 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
            >
              <ResultsSkeleton />
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
