import { genId } from './dates'
import { COURSE_PALETTE } from './constants'
import type { Course } from '@/types'

const DAY_MAP: Record<string, string> = {
  lundi: 'Lundi', lun: 'Lundi',
  mardi: 'Mardi', mar: 'Mardi',
  mercredi: 'Mercredi', mer: 'Mercredi',
  jeudi: 'Jeudi', jeu: 'Jeudi',
  vendredi: 'Vendredi', ven: 'Vendredi',
  samedi: 'Samedi', sam: 'Samedi',
  dimanche: 'Dimanche', dim: 'Dimanche',
  monday: 'Lundi', mon: 'Lundi',
  tuesday: 'Mardi', tue: 'Mardi', tues: 'Mardi',
  wednesday: 'Mercredi', wed: 'Mercredi',
  thursday: 'Jeudi', thu: 'Jeudi', thurs: 'Jeudi',
  friday: 'Vendredi', fri: 'Vendredi',
  saturday: 'Samedi', sat: 'Samedi',
  sunday: 'Dimanche', sun: 'Dimanche',
}

const DAY_REGEX = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|thurs|lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun)\b\.?/i
const DAY_ONLY_LINE = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|thurs|lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun)\b\.?[:\s]*$/i
const TIME_TOKEN = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i
const TIME_RANGE = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*(?:-|–|—|à|a|to|>)\s*(\d{1,2})\s*(?:h|:)?\s*(\d{2})?/i
const DATE_DMY_STRICT = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/
const DATE_YMD_STRICT = /^(\d{4})-(\d{1,2})-(\d{1,2})$/
const DATE_STRICT = /^(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}-\d{1,2}-\d{1,2})$/
const DATE_ANY = /\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}-\d{1,2}-\d{1,2})\b/
const COURSE_CODE = /^[A-Z]{2,4}[\s-]*\d{2,4}$/
const ROOM_MARKER = /\b(salle|étage|etage|amphi|b[aâ]t|room|hall)\b/i

const pad2 = (n: number) => String(n).padStart(2, '0')
const toHM = (h: number, m: number) => `${pad2(h)}:${pad2(m || 0)}`

interface TimeResult {
  start: string
  end: string
  matched: string
}

interface MetaResult {
  code: string
  prof: string
  salle: string
  date: string
}

interface SessionResult {
  title: string
  day: string
  heureDebut: string
  heureFin: string
  date: string | null
  salle: string
  prof: string
}

function normalizeDay(raw: string): string | null {
  if (!raw) return null
  const key = raw.toLowerCase().replace(/\.$/, '').trim()
  return DAY_MAP[key] || null
}

function extractTimes(line: string): TimeResult | null {
  const range = line.match(TIME_RANGE)
  if (range) {
    const h1 = parseInt(range[1], 10), m1 = parseInt(range[2] || '0', 10)
    const h2 = parseInt(range[3], 10), m2 = parseInt(range[4] || '0', 10)
    if (h1 < 0 || h1 > 23 || h2 < 0 || h2 > 23) return null
    return { start: toHM(h1, m1), end: toHM(h2, m2), matched: range[0] }
  }
  const single = line.match(TIME_TOKEN)
  if (single) {
    const h1 = parseInt(single[1], 10), m1 = parseInt(single[2] || '0', 10)
    if (h1 < 0 || h1 > 23) return null
    const h2 = Math.min(h1 + 1, 23)
    return { start: toHM(h1, m1), end: toHM(h2, m1), matched: single[0] }
  }
  return null
}

function cleanToken(str: string): string {
  return str
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s·•|\-–—,:]+|[\s·•|\-–—,:]+$/g, '')
    .trim()
}

function dateToISO(s: string): string | null {
  const dmy = s.match(DATE_DMY_STRICT)
  if (dmy) return `${dmy[3]}-${pad2(Number(dmy[2]))}-${pad2(Number(dmy[1]))}`
  const ymd = s.match(DATE_YMD_STRICT)
  if (ymd) return `${ymd[1]}-${pad2(Number(ymd[2]))}-${pad2(Number(ymd[3]))}`
  return null
}

function explodeGluedLines(rawLines: string[]): string[] {
  const out: string[] = []
  for (let l of rawLines) {
    l = l.trim()
    if (!l) continue
    let remaining = l
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const glued = remaining.match(/^(.*?\d{1,2}[:h]\d{2})(\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}-\d{1,2}-\d{1,2})(.*)$/)
      if (!glued) break
      if (glued[1].trim()) out.push(glued[1].trim())
      out.push(glued[2].trim())
      remaining = glued[3]
    }
    if (remaining.trim()) out.push(remaining.trim())
  }
  return out
}

interface RecurringCourse {
  nom: string
  jour: string
  heureDebut: string
  heureFin: string
  salle: string
  professeur: string
}

function parseRecurringLine(line: string): RecurringCourse | null {
  const dayMatch = line.match(DAY_REGEX)
  const jour = dayMatch ? normalizeDay(dayMatch[0]) : null
  if (!jour) return null

  const times = extractTimes(line)
  if (!times) return null

  const rest = line.replace(dayMatch![0], ' ').replace(times.matched, ' ')
  const parts = rest
    .split(/\s*[·•|]\s*|\s+[-–—]\s+/)
    .map(cleanToken)
    .filter(Boolean)

  if (parts.length === 0) return null

  const nom = parts[0]
  let salle = ''
  let professeur = ''

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]
    if (/^(salle|room|b[aâ]t|amphi)/i.test(p)) {
      salle = p.replace(/^(salle|room)[\s:]*/i, '')
    } else if (/^(prof|mr|mme|m\.|dr)\b/i.test(p)) {
      professeur = p
    } else if (!salle) {
      salle = p
    } else if (!professeur) {
      professeur = p
    }
  }

  return { nom, jour, heureDebut: times.start, heureFin: times.end, salle, professeur }
}

function parseRecurringSchedule(lines: string[]): Course[] {
  const results: RecurringCourse[] = []
  let currentDay: string | null = null

  for (const line of lines) {
    const dayOnly = line.match(DAY_ONLY_LINE)
    if (dayOnly) {
      currentDay = normalizeDay(dayOnly[1])
      continue
    }

    let course = parseRecurringLine(line)
    if (!course && currentDay) {
      course = parseRecurringLine(`${currentDay} ${line}`)
    }
    if (course) results.push(course)
  }

  return results.map((c, i) => ({
    ...c,
    id: genId(),
    color: COURSE_PALETTE[i % COURSE_PALETTE.length],
    dateDebut: undefined,
    dateFin: undefined,
  }))
}

type LineKind = 'day' | 'date' | 'time' | 'meta' | 'title' | 'other'

function detectLineKind(line: string): LineKind {
  if (DAY_ONLY_LINE.test(line)) return 'day'
  if (DATE_STRICT.test(line)) return 'date'
  if (/^\s*\d{1,2}[:h]\d{0,2}\s*[-–—]\s*\d{1,2}[:h]?\d{0,2}\s*$/.test(line)) return 'time'
  if (DATE_ANY.test(line) || ROOM_MARKER.test(line)) return 'meta'
  if (COURSE_CODE.test(line.trim())) return 'meta'
  const numPrefix = line.match(/^\d+[\t\s]+(.{8,})$/)
  if (numPrefix) {
    const rest = numPrefix[1]
    if (ROOM_MARKER.test(rest) || DATE_ANY.test(rest) || COURSE_CODE.test(rest.trim())) return 'meta'
    return 'title'
  }
  if (line.length >= 8 && !/\t/.test(line)) return 'title'
  return 'other'
}

function extractTitleText(line: string): string {
  const numPrefix = line.match(/^\d+[\t\s]+(.{8,})$/)
  if (numPrefix) return numPrefix[1].trim()
  return line.trim()
}

function parseMetaLine(line: string): MetaResult {
  const parts = line.split(/\t+/).map(p => p.trim()).filter(Boolean)
  const meta: MetaResult = { code: '', prof: '', salle: '', date: '' }
  for (const p of parts) {
    if (DATE_STRICT.test(p)) { meta.date = p; continue }
    if (COURSE_CODE.test(p)) { meta.code = p; continue }
    if (ROOM_MARKER.test(p)) { meta.salle = p.replace(/^salle[\s:]*/i, '').trim(); continue }
    if (!meta.prof) { meta.prof = p; continue }
    if (!meta.salle) { meta.salle = p; continue }
  }
  if (parts.length <= 1) {
    const d = line.match(DATE_ANY)
    if (d) meta.date = d[0]
    const c = line.match(/\b([A-Z]{2,4}[\s-]*\d{2,4})\b/)
    if (c) meta.code = c[1]
    if (!meta.salle) {
      const s = line.match(new RegExp(`(${ROOM_MARKER.source}[^\\t]*)`, 'i'))
      if (s) meta.salle = s[1].trim()
    }
  }
  return meta
}

function parseDateBasedSchedule(lines: string[]): Course[] {
  const sessions: SessionResult[] = []
  let currentTitle = ''
  let currentMeta: Omit<MetaResult, 'date'> = { code: '', prof: '', salle: '' }
  let currentDay: string | null = null
  let pendingDate: string | null = null

  for (const line of lines) {
    const kind = detectLineKind(line)

    if (kind === 'title') {
      currentTitle = extractTitleText(line)
      currentMeta = { code: '', prof: '', salle: '' }
      currentDay = null
      pendingDate = null
      continue
    }

    if (kind === 'meta') {
      const meta = parseMetaLine(line)
      if (meta.code) currentMeta.code = meta.code
      if (meta.prof) currentMeta.prof = meta.prof
      if (meta.salle) currentMeta.salle = meta.salle
      if (meta.date) pendingDate = meta.date
      continue
    }

    if (kind === 'date') { pendingDate = line; continue }
    if (kind === 'day')  { currentDay = normalizeDay(line); continue }

    if (kind === 'time') {
      const times = extractTimes(line)
      if (times && currentDay && currentTitle) {
        sessions.push({
          title: currentTitle,
          day: currentDay,
          heureDebut: times.start,
          heureFin: times.end,
          date: pendingDate,
          salle: currentMeta.salle,
          prof: currentMeta.prof,
        })
      }
      continue
    }
  }

  const grouped = new Map<string, SessionResult[]>()
  for (const s of sessions) {
    const key = `${s.title}||${s.day}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(s)
  }

  const titleColor = new Map<string, string>()
  let colorIdx = 0
  const courses: Course[] = []

  for (const list of grouped.values()) {
    const first = list[0]
    if (!titleColor.has(first.title)) {
      titleColor.set(first.title, COURSE_PALETTE[colorIdx % COURSE_PALETTE.length])
      colorIdx++
    }
    const isoDates = list
      .map(s => (s.date ? dateToISO(s.date) : null))
      .filter((d): d is string => d !== null)
      .sort()

    courses.push({
      id: genId(),
      nom: first.title,
      jour: first.day,
      heureDebut: first.heureDebut,
      heureFin: first.heureFin,
      salle: first.salle || '',
      professeur: first.prof || '',
      color: titleColor.get(first.title),
      dateDebut: isoDates[0],
      dateFin: isoDates[isoDates.length - 1],
    })
  }

  return courses
}

export function parseSchedule(text: string): Course[] {
  if (!text || typeof text !== 'string') return []
  const raw = text.split(/\r?\n/)
  const lines = explodeGluedLines(raw)

  const dateCount = lines.filter(l => DATE_STRICT.test(l)).length
  if (dateCount >= 2) {
    const result = parseDateBasedSchedule(lines)
    if (result.length > 0) return result
  }

  return parseRecurringSchedule(lines)
}
