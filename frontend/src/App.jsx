import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import SearchBar from '@/components/SearchBar'
import Passport from '@/components/Passport'
import CompanyCard from '@/components/CompanyCard'
import ExportMenu from '@/components/ExportMenu'
import HazardBanner from '@/components/HazardBanner'
import CarouselNav from '@/components/CarouselNav'
import { Skeleton } from '@/components/ui/skeleton'
import { authStatus, fetchProfile, streamBatch, SessionExpiredError, ApiError } from '@/api'
import { cn } from '@/lib/utils'

// Dead ends — never worth showing as a result card, just a quiet heads-up.
const UNAVAILABLE_CODES = new Set(['PROFILE_NOT_FOUND', 'PROFILE_RESTRICTED'])

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

function SuccessNotice({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(4px)' }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-xs leading-relaxed text-success"
    >
      <CheckCircle2 className="size-4 shrink-0" />
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
  const [unavailable, setUnavailable] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [loggedIn, setLoggedIn] = useState(true)
  const [starred, setStarred] = useState(loadStarred)
  const doneTimer = useRef(null)

  const reduced = useReducedMotion()
  const spring = reduced ? { duration: 0 } : { type: 'spring', duration: 0.55, bounce: 0.12 }
  const active = busy || results.length > 0 || unavailable.length > 0

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

  function goTo(nextIndex) {
    setDirection(nextIndex > activeIndex ? 1 : -1)
    setActiveIndex(nextIndex)
  }

  async function run() {
    clearTimeout(doneTimer.current)
    setBusy(true)
    setError('')
    setDone('')
    setResults([])
    setUnavailable([])
    setActiveIndex(0)
    try {
      if (file) {
        setStreaming(true)
        let ok = 0
        await streamBatch({ file }, (row) => {
          if (UNAVAILABLE_CODES.has(row.error)) {
            setUnavailable((u) => [...u, { url: row.sourceUrl, reason: row.error }])
          } else {
            ok++
            setResults((r) => [...r, row])
          }
        })
        setDone(`Done — ${ok} profile${ok === 1 ? '' : 's'} loaded`)
        doneTimer.current = setTimeout(() => setDone(''), 5000)
      } else {
        const data = await fetchProfile(url.trim())
        setResults([{ row: 0, ...data }])
      }
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        setError(SESSION_MSG)
      } else if (e instanceof ApiError && UNAVAILABLE_CODES.has(e.code)) {
        setUnavailable([{ url: url.trim(), reason: e.code }])
      } else {
        setError(e.message)
      }
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
                Paste a profile or company URL, or attach a .csv / .txt of up to 50 of them.
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
            {done && !error && <SuccessNotice key="done">{done}</SuccessNotice>}
          </AnimatePresence>
          <HazardBanner items={unavailable} />
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

          {results.length > 0 && (
            <>
              <div className="overflow-hidden">
                <AnimatePresence initial={false} mode="wait" custom={direction}>
                  {results[activeIndex] && (
                    <motion.div
                      key={rowKey(results[activeIndex])}
                      custom={direction}
                      initial={{ opacity: 0, x: reduced ? 0 : 24 * direction, filter: reduced ? 'none' : 'blur(8px)' }}
                      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: reduced ? 0 : -24 * direction, filter: reduced ? 'none' : 'blur(8px)' }}
                      transition={{ duration: reduced ? 0 : 0.3, ease: [0.23, 1, 0.32, 1] }}
                    >
                      {results[activeIndex].type === 'company' ? (
                        <CompanyCard
                          profile={results[activeIndex]}
                          starred={starred.has(rowKey(results[activeIndex]))}
                          onToggleStar={() => toggleStar(rowKey(results[activeIndex]))}
                        />
                      ) : (
                        <Passport
                          profile={results[activeIndex]}
                          starred={starred.has(rowKey(results[activeIndex]))}
                          onToggleStar={() => toggleStar(rowKey(results[activeIndex]))}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-center">
                <CarouselNav index={activeIndex} total={results.length} onChange={goTo} />
              </div>
            </>
          )}

          {streaming && results.length > 0 && activeIndex === results.length - 1 && (
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
