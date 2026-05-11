// ─────────────────────────────────────────────
// src/core/schedule-parser.ts — 上课时间解析（纯函数，无 DOM 依赖）
// ─────────────────────────────────────────────

import type { Course, SlotPlacement } from '../types'
import { DAYS, SLOTS } from '../constants'
import { toHalfWidthChars } from '../utils/helpers'

// ── 星期字符 → dayKey 映射 ────────────────────
const WEEK_CHAR_TO_KEY: Record<string, string> = {
  一: 'mon', 二: 'tue', 三: 'wed', 四: 'thu',
  五: 'fri', 六: 'sat', 日: 'sun', 天: 'sun',
}

/** 全角/半角破折号与波浪号统一为半角「-」 */
export function normalizeTimeToken(s: string): string {
  return String(s).replace(/\u2013|\u2014|～|~/g, '-')
}

/** 去掉段尾「{…周}」类周次说明，返回正文与可读周次文案 */
function stripTrailingWeekBracket(segment: string): { base: string; week: string } {
  const s0 = toHalfWidthChars(String(segment == null ? '' : segment).trim())
  const m = s0.match(/\{([^}]*)\}\s*$/)
  if (!m) return { base: s0, week: '' }
  const base = s0.slice(0, m.index).trim()
  return { base, week: formatWeekPatternDisplay(m[1]) }
}

/** 周次内容格式化为可读文案，如 `"2-18周（单周）"` */
export function formatWeekPatternDisplay(innerRaw: string): string {
  let s = toHalfWidthChars(String(innerRaw || '').trim()).replace(/\s+/g, '')
  if (!s) return ''
  const single = /单周?$/.test(s) || /^单/.test(s)
  const double = /双周?$/.test(s) || /^双/.test(s)
  s = s.replace(/单周?$|双周?$/g, '').replace(/周$/g, '')
  if (!s) return String(innerRaw || '').trim()
  let out = s + '周'
  if (single) out += '（单周）'
  else if (double) out += '（双周）'
  return out
}

/** 中文节次「一…十」→ 数字范围，用于「一至二节」 */
function chineseLessonSpanToRangeDigits(
  aTok: string,
  bTok: string
): { lo: number; hi: number; start: number } | null {
  const map: Record<string, number> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
    六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
  }
  const parseOne = (tok: string): number | null => {
    const t = String(tok || '').trim()
    if (/^\d+$/.test(t)) return parseInt(t, 10)
    if (map[t] != null) return map[t]
    if (t.length === 2 && t[0] === '十' && map[t[1]] != null) return 10 + map[t[1]]
    if (t.length === 2 && map[t[0]] != null && t[1] === '十') return map[t[0]] * 10
    return null
  }
  const lo = parseOne(aTok)
  const hi = parseOne(bTok)
  if (lo == null || hi == null) return null
  return { lo, hi: Math.max(lo, hi), start: lo }
}

/**
 * 单段上课时间文本归一化（中英文兼容）。
 * 将各种写法统一为「星期X第N-M节{周次}」格式。
 */
export function normalizeScheduleSegmentForParse(segment: string): string {
  let s = toHalfWidthChars(String(segment == null ? '' : segment).trim())
  s = normalizeTimeToken(s)
  if (!s) return ''
  // English: "Periods 3-4" / "Period 3" → 第3-4节 / 第3节
  s = s.replace(/\bPeriods?\s+(\d{1,2})\s*[-~]\s*(\d{1,2})\b/gi, '第$1-$2节')
  s = s.replace(/\bPeriods?\s+(\d{1,2})\b/gi, '第$1节')
  // English: "Weeks 2-19" → {2-19周}
  s = s.replace(/\bWeeks?\s+(\d{1,2})\s*[-~]\s*(\d{1,2})\b/gi, '{$1-$2周}')
  s = s.replace(/周([一二三四五六日天])第(\d{1,2})\s*[,，]\s*(\d{1,2})节/g, '星期$1第$2-$3节')
  s = s.replace(/(\d{1,2})\s*[~～]\s*(\d{1,2})\s*节/g, '第$1-$2节')
  s = s.replace(
    /([一二三四五六七八九十]{1,3})至([一二三四五六七八九十]{1,3})节/g,
    (_m, a: string, b: string) => {
      const r = chineseLessonSpanToRangeDigits(a, b)
      return r ? `第${r.start}-${r.hi}节` : _m
    }
  )
  s = s.replace(
    /第([一二三四五六七八九十]{1,3})[、，]([一二三四五六七八九十]{1,3})节/g,
    (_m, a: string, b: string) => {
      const r = chineseLessonSpanToRangeDigits(a, b)
      return r ? `第${r.start}节;第${r.hi}节` : _m
    }
  )
  s = s.replace(/第(\d{1,2})节至第(\d{1,2})节/g, '第$1-$2节')
  s = s.replace(
    /(星期[一二三四五六日天]|周[一二三四五六日天])第(\d{1,2}-\d{1,2}),(\d{1,2}-\d{1,2})节/g,
    '$1第$2节;$1第$3节'
  )
  s = s.replace(/第(\d{1,2}-\d{1,2}),(\d{1,2}-\d{1,2})节/g, '第$1节;第$2节')
  s = s.replace(/(\d{1,2}-\d{1,2})\s*,\s*(\d{1,2}-\d{1,2})节/g, '第$1节;第$2节')
  return s
}

/** 自动填格：整段「上课时间」先归一再按分号切段 */
export function normalizeCourseScheduleForAutofill(tf: unknown): string {
  let s = toHalfWidthChars(String(tf == null ? '' : tf).trim())
  s = normalizeTimeToken(s)
  // 合并「星期X第N-M节{周次};星期X第N-M节{周次}」中多余空格
  s = s.replace(/\s*;\s*/g, ';').replace(/\s*；\s*/g, ';')
  return s
}

/** 从文本中提取星期 dayKey */
export function parseWeekdayKeyInText(text: string): string | null {
  const t = toHalfWidthChars(String(text))
  let m = t.match(/星期([一二三四五六日天])/)
  if (m) return WEEK_CHAR_TO_KEY[m[1]] ?? null
  m = t.match(/周([一二三四五六日天])/)
  if (m) return WEEK_CHAR_TO_KEY[m[1]] ?? null
  m = t.match(/周([1-7])(?!\d)/)
  if (m) {
    const digit = parseInt(m[1], 10)
    const map: Record<number, string> = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日' }
    const ch = map[digit]
    return ch ? (WEEK_CHAR_TO_KEY[ch] ?? null) : null
  }
  // English weekday names
  const EN_DAY_MAP: Record<string, string> = {
    monday: 'mon', mon: 'mon',
    tuesday: 'tue', tue: 'tue',
    wednesday: 'wed', wed: 'wed',
    thursday: 'thu', thu: 'thu',
    friday: 'fri', fri: 'fri',
    saturday: 'sat', sat: 'sat',
    sunday: 'sun', sun: 'sun',
  }
  const tLower = t.toLowerCase().replace(/[^a-z]/g, ' ')
  for (const [word, key] of Object.entries(EN_DAY_MAP)) {
    const re = new RegExp('(?:^|\\s)' + word + '(?:\\s|$)')
    if (re.test(tLower)) return key
  }
  return null
}

/** 获取 slotKey 对应的节次范围 { lo, hi } */
export function slotLessonBounds(slotKey: string): { key: string; lo: number; hi: number } | null {
  const slot = SLOTS.find((x) => x.key === slotKey)
  if (!slot) return null
  const lab = normalizeTimeToken(toHalfWidthChars(slot.label))
  const m = lab.match(/第(\d+)-(\d+)节/)
  if (!m) return null
  return { key: slotKey, lo: parseInt(m[1], 10), hi: parseInt(m[2], 10) }
}

/** 返回覆盖节次范围 [start, end] 的所有 slotKey */
export function slotKeysCoveringLessonRange(start: number, end: number): string[] {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const keys: string[] = []
  for (const slot of SLOTS) {
    const b = slotLessonBounds(slot.key)
    if (!b) continue
    if (b.lo <= hi && b.hi >= lo) keys.push(slot.key)
  }
  return keys
}

/**
 * 解析单段上课时间文本为 SlotPlacement 数组。
 * 例：`"星期三第3-4节{2-19周}"` → `[{ dayKey:'wed', slotKey:'p34', weekPattern:'2-19周' }]`
 */
export function parseOneScheduleSegment(segment: string): SlotPlacement[] {
  const full = String(segment == null ? '' : segment).trim()
  if (!full) return []
  const hasTopLevelSemi = /[;；]/.test(toHalfWidthChars(full))
  let weekOuter = ''
  let work = full
  if (!hasTopLevelSemi) {
    const st = stripTrailingWeekBracket(full)
    work = st.base
    weekOuter = st.week
  }
  const normalized = normalizeScheduleSegmentForParse(work)
  if (!normalized) return []
  if (/[;；]/.test(normalized)) {
    const pieces = normalized.split(/[;；]/).map((x) => x.trim()).filter(Boolean)
    const merged: SlotPlacement[] = []
    for (const p of pieces) merged.push(...parseOneScheduleSegment(p))
    const seen = new Set<string>()
    const out: SlotPlacement[] = []
    for (const pt of merged) {
      const k = `${pt.dayKey}-${pt.slotKey}`
      if (seen.has(k)) continue
      seen.add(k)
      if (weekOuter && !pt.weekPattern) pt.weekPattern = weekOuter
      out.push(pt)
    }
    return out
  }
  const raw = normalized
  const dayKey = parseWeekdayKeyInText(raw)
  if (!dayKey || !DAYS.some((d) => d.key === dayKey)) return []
  let start: number
  let end: number
  let m = raw.match(/第(\d{1,2})-(\d{1,2})节/)
  if (m) {
    start = parseInt(m[1], 10)
    end = parseInt(m[2], 10)
  } else {
    m = raw.match(/第(\d{1,2})节/)
    if (m) {
      start = end = parseInt(m[1], 10)
    } else {
      return []
    }
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return []
  const slotKeys = slotKeysCoveringLessonRange(start, end)
  const weekBracket = raw.match(/\{([^}]*)\}/)
  const weekPattern = weekBracket
    ? formatWeekPatternDisplay(weekBracket[1])
    : weekOuter || undefined
  return slotKeys.map((slotKey) => ({
    dayKey,
    slotKey,
    weekPattern,
  }))
}

/**
 * 获取课程在指定格子的周次提示文案。
 * 例：`"2-18周"` 或 `""`（无周次信息时）
 */
export function weekHintForCell(
  course: Course,
  dayKey: string,
  slotKey: string
): string {
  const full = course?.上课时间 != null ? String(course.上课时间).trim() : ''
  if (!full) return ''
  const merged = normalizeCourseScheduleForAutofill(full)
  const parts = merged.split(/[;；]/).map((x) => x.trim()).filter(Boolean)
  for (const part of parts) {
    const pts = parseOneScheduleSegment(part)
    if (pts.some((pt) => pt.dayKey === dayKey && pt.slotKey === slotKey && pt.weekPattern)) {
      const hit = pts.find((pt) => pt.dayKey === dayKey && pt.slotKey === slotKey)
      return hit?.weekPattern ? String(hit.weekPattern) : ''
    }
  }
  return ''
}

/**
 * 将课程「上课时间」解析为所有 SlotPlacement（去重）。
 * 用于自动填格和课程定位。
 */
export function parseCourseToSchedulePlacements(course: Course): SlotPlacement[] {
  const tf = course?.上课时间
  if (!tf || !String(tf).trim()) return []
  const merged = normalizeCourseScheduleForAutofill(tf)
  const parts = merged.split(/[;；]/).map((x) => x.trim()).filter(Boolean)
  const seen = new Set<string>()
  const res: SlotPlacement[] = []
  for (const p of parts) {
    const pts = parseOneScheduleSegment(p)
    for (const pt of pts) {
      const k = `${pt.dayKey}-${pt.slotKey}`
      if (seen.has(k)) continue
      seen.add(k)
      res.push(pt)
    }
  }
  return res
}
