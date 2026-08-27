import { motion } from 'framer-motion'
import { AlertTriangle, Building2, ExternalLink, MapPin, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ExpandableBadges } from '@/components/Expandable'
import StarButton from '@/components/StarButton'

function Stat({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium">{value}</p>
    </div>
  )
}

function fmtFollowers(n) {
  if (n == null) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// Deliberately separate from Passport — company data has a different shape
// (no experience/education/skills) and reads better as an org profile card
// than a person's passport.
export default function CompanyCard({ profile, starred, onToggleStar }) {
  const shell = 'relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border bg-card shadow-sm'

  if (profile.error) {
    return (
      <div className={shell}>
        <StarButton starred={starred} onToggle={onToggleStar} />
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <AlertTriangle className="size-5 text-destructive" />
          <p className="text-sm font-medium">Couldn't fetch this company</p>
          <p className="max-w-md break-all text-xs text-muted-foreground">{profile.sourceUrl}</p>
          <p className="max-w-md text-xs text-muted-foreground">{profile.error}</p>
        </div>
      </div>
    )
  }

  const { specialties = [] } = profile

  return (
    <div className={shell}>
      <StarButton starred={starred} onToggle={onToggleStar} />

      {profile.coverImage && (
        <div className="h-16 w-full overflow-hidden">
          <img src={profile.coverImage} alt="" className="size-full object-cover" />
        </div>
      )}

      <div className="flex items-start gap-3 border-b p-4 pr-12">
        <Avatar className="size-12 shrink-0 rounded-lg border bg-background">
          <AvatarImage src={profile.logo || undefined} alt={profile.name} className="object-contain p-1" />
          <AvatarFallback className="rounded-lg text-sm">
            <Building2 className="size-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-base font-semibold leading-tight tracking-tight">{profile.name}</h2>
            <Badge variant="outline" className="shrink-0 rounded-md px-1.5 py-0 text-[9px] font-medium">
              Company
            </Badge>
          </div>
          {profile.tagline && (
            <p className="mt-0.5 truncate text-xs leading-snug text-muted-foreground">{profile.tagline}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {profile.headquarters && (
              <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <MapPin className="size-2.5" />
                {profile.headquarters}
              </p>
            )}
            <a
              href={profile.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-2.5" />
              page
            </a>
          </div>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        className="space-y-3 p-4"
      >
        {profile.about && (
          <motion.p
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            className="line-clamp-3 text-xs leading-relaxed text-muted-foreground"
          >
            {profile.about}
          </motion.p>
        )}

        <motion.div
          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <Stat label="Industry" value={profile.industry} />
          <Stat label="Employees" value={profile.staffCount?.toLocaleString()} />
          <Stat
            label="Followers"
            value={profile.followerCount != null ? fmtFollowers(profile.followerCount) : null}
          />
          <Stat label="Founded" value={profile.founded} />
        </motion.div>

        {profile.website && (
          <motion.a
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            href={profile.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline"
          >
            <ExternalLink className="size-2.5" />
            {profile.website.replace(/^https?:\/\//, '')}
          </motion.a>
        )}

        {specialties.length > 0 && (
          <motion.div variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
            <h3 className="mb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Specialties
            </h3>
            <ExpandableBadges items={specialties} max={8} />
          </motion.div>
        )}

        {profile.followerCount == null && specialties.length === 0 && !profile.about && (
          <motion.p
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <Users className="size-3" />
            No further public details available for this page.
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
