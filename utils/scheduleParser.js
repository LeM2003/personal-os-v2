import { genId } from './dates'
import { COURSE_PALETTE } from './constants'

const DAY_MAP = {
  // Français
  lundi: 'Lundi', lun: 'Lundi',
  mardi: 'Mardi', mar: 'Mardi',
  mercredi: 'Mercredi', mer: 'Mercredi',
  jeudi: 'Jeudi', jeu: 'Jeudi',
  vendredi: 'Vendredi', ven: 'Vendredi',
  samedi: 'Samedi', sam: 'Samedi',
  dimanche: 'Dimanche', dim: 'Dimanche',
  // Anglais (mappé vers français)
  monday: 'Lundi', mon: 'Lundi',
  tuesday: 'Mardi', tue: 'Mardi', tues: 'Mardi',
  wednesday: 'Mercredi', wed: 'Mercredi',
  thursday: 'Jeudi', thu: 'Jeudi', thurs: 'Jeudi',
  friday: 'Vendredi', fri: 'Vendredi',
  saturday: 'Samedi', sat: 'Samedi',
  sunday: 'Dimanche', sun: 'Dimanche',
}

// Plus longs en premier pour éviter qu'un nom court l'emporte sur un long
const DAY_REGEX = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|thurs|lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun)\b\.?/i
const DAY_ONLY_LINE = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|thurs|lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun)\b\.?[:\s]*$/i
const TIME_TOKEN = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?/i
const TIME_RANGE = /(\d{1,2})\s*(?:h|:)\s*(\d{2})?\s*(?:-|–|—|à|a|to|>)\s*(\d{1,2})\s*(?:h|:)?\s*(\d{2})?/i
// Dates: dd-mm-yyyy, dd/mm/yyyy, dd.mm.yyyy, yyyy-mm-dd
const DATE_DMY_STRICT = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/
const DATE_YMD_STRICT = /^(\d{4})-(\d{1,2})-(\d{1,2})$/
const DATE_STRICT = /^(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}-\d{1,2}-\d{1,2})$/
const DATE_ANY = /\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{4}-\d{1,2}-\d{1,2})\b/
const COURSE_CODE = /^[A-Z]{2,4}[\s-]*\d{2,4}$/
const ROOM_MARKER = /\b(salle|étage|etage|amphi|b[aâ]t|room|hall)\b/i

const pad2 = n => String(n).padStart(2, '0')
const toHM = (h, m) => `${pad2(h)}:${pad2(m || 0)}`

function normalizeDay(raw) {
  if (!raw) return null
  const key = raw.toLowerCase().replace(/\.$/, '').trim()
  return DAY_MAP[key] || null
}

function extractTimes(line) {
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

function cleanToken(str) {
  return str
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s·•|\-–—,:]+|[\s·•|\-–—,:]+$/g, '')
    .trim()
}

function dateToISO(s) {
  const dmy = s.match(DATE_DMY_STRICT)
  if (dmy) return `${dmy[3]}-${pad2(dmy[2])}-${pad2(dmy[1])}`
  const ymd = s.match(DATE_YMD_STRICT)
  if (ymd) return `${ymd[1]}-${pad2(ymd[2])}-${pad2(ymd[3])}`
  return null
}

// Pré-traitement : quelques portails collent heure et date (ex: "18:00-21:1524-03-2026")
// → on casse en deux lignes distinctes.
function explodeGluedLines(rawLines) {
  const out = []
  for (let l of rawLines) {
    l = l.trim()
    if (!l) continue
    let remaining = l
    // Tant qu'on trouve un motif "time-like suivi d'une date collée", on sépare.
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

// ── Format 1 : récurrent (titre + jour + heure sur une même ligne) ─────────
function parseRecurringLine(line) {
  const dayMatch = line.match(DAY_REGEX)
  const jour = dayMatch ? normalizeDay(dayMatch[0]) : null
  if (!jour) return null

  const times = extractTimes(line)
  if (!times) return null

  let rest = line.replace(dayMatch[0], ' ').replace(times.matched, ' ')
  const parts = rest
    .split(/\s*[·•|]\s*|\s+[-–—]\s+/)
    .map(cleanToken)
    .filter(Boolean)

  if (parts.length === 0) return null

  let nom = parts[0]
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

function parseRecurringSchedule(lines) {
  const results = []
  let currentDay = null

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
    dateDebut: null,
    dateFin: null,
  }))
}

// ── Format 2 : basé sur dates (portail type "titre / code+prof+salle+date / jour / heure / date / jour / heure...") ──
function detectLineKind(line) {
  if (DAY_ONLY_LINE.test(line)) return 'day'
  if (DATE_STRICT.test(line)) return 'date'
  // ligne "time range only" : "18:00-21:15" ou "8h-10h"
  if (/^\s*\d{1,2}[:h]\d{0,2}\s*[-–—]\s*\d{1,2}[:h]?\d{0,2}\s*$/.test(line)) return 'time'
  // ligne meta : contient une date, un marqueur salle/étage, ou un code cours
  if (DATE_ANY.test(line) || ROOM_MARKER.test(line)) return 'meta'
  // ligne de code seul
  if (COURSE_CODE.test(line.trim())) return 'meta'
  // ligne qui démarre par "N tab TEXTE long" = titre avec préfixe numérique du portail
  const numPrefix = line.match(/^\d+[\t\s]+(.{8,})$/)
  if (numPrefix) {
    const rest = numPrefix[1]
    // si rest contient marqueur meta → meta, sinon titre
    if (ROOM_MARKER.test(rest) || DATE_ANY.test(rest) || COURSE_CODE.test(rest.trim())) return 'meta'
    return 'title'
  }
  // texte long sans tab, sans marqueur → titre
  if (line.length >= 8 && !/\t/.test(line)) return 'title'
  return 'other'
}

function extractTitleText(line) {
  const numPrefix = line.match(/^\d+[\t\s]+(.{8,})$/)
  if (numPrefix) return numPrefix[1].trim()
  return line.trim()
}

function parseMetaLine(line) {
  // "GET 405\tDRIDI Amira\tEtage 4 - Salle 401\t23-03-2026"
  const parts = line.split(/\t+/).map(p => p.trim()).filter(Boolean)
  const meta = { code: '', prof: '', salle: '', date: '' }
  for (const p of parts) {
    if (DATE_STRICT.test(p)) { meta.date = p; continue }
    if (COURSE_CODE.test(p)) { meta.code = p; continue }
    if (ROOM_MARKER.test(p)) { meta.salle = p.replace(/^salle[\s:]*/i, '').trim(); continue }
    if (!meta.prof) { meta.prof = p; continue }
    if (!meta.salle) { meta.salle = p; continue }
  }
  // Si split par tab a échoué (une seule grosse chaîne), extraire la date en queue
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

function parseDateBasedSchedule(lines) {
  const sessions = []
  let currentTitle = ''
  let currentMeta = { code: '', prof: '', salle: '' }
  let currentDay = null
  let pendingDate = null

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

    if (kind === 'date') {
      pendingDate = line
      continue
    }

    if (kind === 'day') {
      currentDay = normalizeDay(line)
      continue
    }

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

  // Regrouper par (titre, jour) et créer un cours par paire
  const grouped = new Map()
  for (const s of sessions) {
    const key = `${s.title}||${s.day}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(s)
  }

  const titleColor = new Map()
  let colorIdx = 0
  const courses = []

  for (const list of grouped.values()) {
    const first = list[0]
    if (!titleColor.has(first.title)) {
      titleColor.set(first.title, COURSE_PALETTE[colorIdx % COURSE_PALETTE.length])
      colorIdx++
    }
    const isoDates = list
      .map(s => (s.date ? dateToISO(s.date) : null))
      .filter(Boolean)
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
      dateDebut: isoDates[0] || null,
      dateFin: isoDates[isoDates.length - 1] || null,
    })
  }

  return courses
}

// ── Entrée principale ─────────────────────────────────────────────────────
export function parseSchedule(text) {
  if (!text || typeof text !== 'string') return []
  const raw = text.split(/\r?\n/)
  const lines = explodeGluedLines(raw)

  // Si on trouve au moins 2 dates (dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd…) → format "portail daté"
  const dateCount = lines.filter(l => DATE_STRICT.test(l)).length
  if (dateCount >= 2) {
    const result = parseDateBasedSchedule(lines)
    if (result.length > 0) return result
  }

  // Fallback : format récurrent (titre + jour + heure ensemble)
  return parseRecurringSchedule(lines)
}
