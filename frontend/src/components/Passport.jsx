import { motion } from 'framer-motion'
import { AlertTriangle, MapPin, Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtDate(d) {
  if (!d?.year) return null
  return d.month ? `${MONTHS[d.month - 1]} ${d.year}` : String(d.year)
}

function range(start, end) {
  const from = fmtDate(start)
  if (!from) return null
  return `${from} — ${fmtDate(end) || 'Present'}`
}

function Section({ label, span, children }) {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className={span ? 'md:col-span-2' : ''}
    >
      <h3 className="mb-3 border-b pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </motion.section>
  )
}

function Entry({ title, subtitle, meta, description }) {
  return (
    <li className="border-l pl-4">
      <p className="text-sm font-medium leading-snug">{title || '—'}</p>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      {meta && <p className="mt-0.5 font-mono text-[11px] tracking-wide text-muted-foreground">{meta}</p>}
      {description && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </li>
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
      className="absolute right-3 top-3 z-10 rounded-full bg-card/90 backdrop-blur active:scale-97"
    >
      <Star className={cn('size-4', starred && 'fill-foreground')} />
    </Button>
  )
}

export default function Passport({ profile, starred, onToggleStar }) {
  const shell = 'relative overflow-hidden rounded-2xl border bg-card shadow-sm'

  if (profile.error) {
    return (
      <div className={shell}>
        <StarButton starred={starred} onToggle={onToggleStar} />
        <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
          <AlertTriangle className="size-6 text-destructive" />
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
      <div className="h-28 bg-gradient-to-br from-muted to-accent">
        {profile.bannerImage && (
          <img src={profile.bannerImage} alt="" className="size-full object-cover" />
        )}
      </div>

      <div className="px-8 pb-8">
        <div className="-mt-12 flex flex-wrap items-end gap-5">
          <Avatar className="size-24 rounded-xl border-4 border-card shadow-sm">
            <AvatarImage src={profile.profileImage || undefined} alt={profile.name} className="object-cover" />
            <AvatarFallback className="rounded-xl text-xl">{profile.name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pb-1">
            <h2 className="truncate text-2xl font-semibold tracking-tight">{profile.name}</h2>
            {profile.headline && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{profile.headline}</p>
            )}
            {profile.location && (
              <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <MapPin className="size-3" />
                {profile.location}
              </p>
            )}
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-3"
        >
          {profile.about && (
            <Section label="About" span>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{profile.about}</p>
            </Section>
          )}

          {skills.length > 0 && (
            <Section label="Skills">
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <Badge key={s} variant="secondary" className="font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {experience.length > 0 && (
            <Section label="Experience" span>
              <ul className="space-y-5">
                {experience.map((e, i) => (
                  <Entry
                    key={i}
                    title={e.title}
                    subtitle={[e.company, e.location].filter(Boolean).join(' · ')}
                    meta={range(e.startDate, e.endDate)}
                    description={e.description}
                  />
                ))}
              </ul>
            </Section>
          )}

          {education.length > 0 && (
            <Section label="Education">
              <ul className="space-y-5">
                {education.map((e, i) => (
                  <Entry
                    key={i}
                    title={e.school}
                    subtitle={[e.degree, e.field].filter(Boolean).join(', ')}
                    meta={range(e.startDate, e.endDate)}
                  />
                ))}
              </ul>
            </Section>
          )}

          {certifications.length > 0 && (
            <Section label="Certifications" span>
              <ul className="space-y-4">
                {certifications.map((c, i) => (
                  <li key={i} className="border-l pl-4">
                    <p className="text-sm font-medium">
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {c.name || '—'}
                        </a>
                      ) : (
                        c.name || '—'
                      )}
                    </p>
                    {c.authority && <p className="text-sm text-muted-foreground">{c.authority}</p>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {languages.length > 0 && (
            <Section label="Languages">
              <ul className="space-y-2">
                {languages.map((l, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{l.name || '—'}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{l.proficiency}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </motion.div>

        <a
          href={profile.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-10 block break-all font-mono text-[11px] text-muted-foreground hover:text-foreground"
        >
          {profile.sourceUrl}
        </a>
      </div>
    </div>
  )
}
