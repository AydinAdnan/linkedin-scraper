import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ExternalLink, MapPin, Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MAX_ENTRIES = 3
const MAX_SKILLS = 8

function fmtDate(d) {
  if (!d?.year) return null
  return d.month ? `${MONTHS[d.month - 1]} ${d.year}` : String(d.year)
}

function range(start, end) {
  const from = fmtDate(start)
  if (!from) return null
  return `${from}–${fmtDate(end) || 'Present'}`
}

function Section({ label, span, children }) {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
      className={span ? 'md:col-span-2' : ''}
    >
      <h3 className="mb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </motion.section>
  )
}

function Entry({ title, subtitle, meta }) {
  return (
    <li className="border-l pl-2.5">
      <p className="truncate text-xs font-medium leading-tight">{title || '—'}</p>
      {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
      {meta && <p className="font-mono text-[10px] tracking-wide text-muted-foreground">{meta}</p>}
    </li>
  )
}

// Shows the first `max` items; clicking "+N more" reveals the rest inside a
// capped, independently scrollable area so the card itself never grows.
function ExpandableList({ items, max, renderItem }) {
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

function ExpandableBadges({ items, max }) {
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

function StarButton({ starred, onToggle }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={onToggle}
      aria-pressed={starred}
      aria-label={starred ? 'Unstar profile' : 'Star profile'}
      className="absolute right-2.5 top-2.5 z-10 rounded-full bg-card active:scale-97"
    >
      <Star className={cn('size-3.5', starred && 'fill-foreground')} />
    </Button>
  )
}

export default function Passport({ profile, starred, onToggleStar }) {
  const shell = 'relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border bg-card shadow-sm'

  if (profile.error) {
    return (
      <div className={shell}>
        <StarButton starred={starred} onToggle={onToggleStar} />
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <AlertTriangle className="size-5 text-destructive" />
          <p className="text-sm font-medium">Couldn't fetch this profile</p>
          <p className="max-w-md break-all text-xs text-muted-foreground">{profile.sourceUrl}</p>
          <p className="max-w-md text-xs text-muted-foreground">{profile.error}</p>
        </div>
      </div>
    )
  }

  const { experience = [], education = [], skills = [], certifications = [], languages = [] } = profile

  return (
    <div className={shell}>
      <StarButton starred={starred} onToggle={onToggleStar} />

      <div className="flex items-start gap-3 border-b p-4 pr-12">
        <Avatar className="size-12 shrink-0 rounded-lg border">
          <AvatarImage src={profile.profileImage || undefined} alt={profile.name} className="object-cover" />
          <AvatarFallback className="rounded-lg text-sm">{profile.name?.[0] || '?'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold leading-tight tracking-tight">{profile.name}</h2>
          {profile.headline && (
            <p className="mt-0.5 truncate text-xs leading-snug text-muted-foreground">{profile.headline}</p>
          )}
          <div className="mt-1 flex items-center gap-2">
            {profile.location && (
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <MapPin className="size-2.5" />
                {profile.location}
              </p>
            )}
            <a
              href={profile.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-2.5" />
              profile
            </a>
          </div>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        className="grid grid-cols-1 gap-x-6 gap-y-3 p-4 md:grid-cols-2"
      >
        {profile.about && (
          <Section label="About" span>
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{profile.about}</p>
          </Section>
        )}

        {experience.length > 0 && (
          <Section label="Experience">
            <ExpandableList
              items={experience}
              max={MAX_ENTRIES}
              renderItem={(e, i) => (
                <Entry
                  key={i}
                  title={e.title}
                  subtitle={[e.company, e.location].filter(Boolean).join(' · ')}
                  meta={range(e.startDate, e.endDate)}
                />
              )}
            />
          </Section>
        )}

        {education.length > 0 && (
          <Section label="Education">
            <ExpandableList
              items={education}
              max={MAX_ENTRIES}
              renderItem={(e, i) => (
                <Entry
                  key={i}
                  title={e.school}
                  subtitle={[e.degree, e.field].filter(Boolean).join(', ')}
                  meta={range(e.startDate, e.endDate)}
                />
              )}
            />
          </Section>
        )}

        {skills.length > 0 && (
          <Section label="Skills">
            <ExpandableBadges items={skills} max={MAX_SKILLS} />
          </Section>
        )}

        {certifications.length > 0 && (
          <Section label="Certifications">
            <ExpandableList
              items={certifications}
              max={MAX_ENTRIES}
              renderItem={(c, i) => <Entry key={i} title={c.name} subtitle={c.authority} />}
            />
          </Section>
        )}

        {languages.length > 0 && (
          <Section label="Languages">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {languages.map((l, i) => (
                <span key={i} className="text-muted-foreground">
                  {l.name}
                  {l.proficiency && <span className="text-[10px]"> · {l.proficiency}</span>}
                </span>
              ))}
            </div>
          </Section>
        )}
      </motion.div>
    </div>
  )
}
