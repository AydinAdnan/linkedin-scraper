const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtDate(d) {
  if (!d?.year) return null
  return d.month ? `${MONTHS[d.month - 1]} ${d.year}` : String(d.year)
}

function range(start, end) {
  const from = fmtDate(start)
  if (!from) return ''
  return `${from} - ${fmtDate(end) || 'Present'}`
}

const COLUMNS = ['name', 'headline', 'location', 'about', 'skills', 'experience', 'education', 'certifications', 'languages', 'sourceUrl', 'error']

function rowToRecord(profile) {
  if (profile.error) {
    return { sourceUrl: profile.sourceUrl || '', error: profile.error }
  }
  const experience = (profile.experience || [])
    .map((e) => [e.title, e.company, range(e.startDate, e.endDate)].filter(Boolean).join(', '))
    .join(' ; ')
  const education = (profile.education || [])
    .map((e) => [e.school, [e.degree, e.field].filter(Boolean).join(' '), range(e.startDate, e.endDate)].filter(Boolean).join(', '))
    .join(' ; ')
  const certifications = (profile.certifications || []).map((c) => c.name).filter(Boolean).join(' ; ')
  const languages = (profile.languages || [])
    .map((l) => [l.name, l.proficiency].filter(Boolean).join(' - '))
    .join(' ; ')

  return {
    name: profile.name || '',
    headline: profile.headline || '',
    location: profile.location || '',
    about: profile.about || '',
    skills: (profile.skills || []).join('; '),
    experience,
    education,
    certifications,
    languages,
    sourceUrl: profile.sourceUrl || '',
    error: '',
  }
}

function escapeCell(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function profilesToCsv(profiles) {
  const lines = [COLUMNS.join(',')]
  for (const p of profiles) {
    const record = rowToRecord(p)
    lines.push(COLUMNS.map((c) => escapeCell(record[c])).join(','))
  }
  return lines.join('\r\n')
}

export function downloadCsv(filename, profiles) {
  const csv = profilesToCsv(profiles)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
