// ─────────────────────────────────────────────
// src/utils/helpers.ts — 通用工具函数（纯函数，无 DOM 依赖）
// ─────────────────────────────────────────────

import type { Course } from '../types'

/** HTML 特殊字符转义 */
export function escapeHtml(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 全角字符 → 半角；全角空格 → 普通空格 */
export function toHalfWidthChars(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/\u3000/g, ' ')
    .replace(/[\uff01-\uff5e]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    )
}

/** null / undefined / 非字符串 → 空字符串；其余 trim */
export function normalizeCell(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

/** Excel 复选框 / 文本 → 是否网课 */
export function parseOnlineField(raw: unknown): boolean {
  if (raw === true || raw === 1) return true
  if (raw === false || raw === 0) return false
  const s = normalizeCell(raw).toLowerCase()
  if (!s) return false
  if (['1', '是', 'y', 'yes', 'true', '√', '✓', '网课', 'online'].includes(s)) return true
  return false
}

/**
 * 选课表「课程类别」列样式类：
 * 专业/必修 → cat-warn；公共/通识 → cat-safe；其余 → cat-unknown
 * 同时支持英文类别名称
 */
export function enrollCategoryTdClass(catRaw: unknown): string {
  const t = String(catRaw == null ? '' : catRaw)
  // 中文关键词
  if (t.includes('专业') || t.includes('必修')) return 'cat-warn'
  if (t.includes('公共') || t.includes('通识')) return 'cat-safe'
  // 英文关键词（大小写不敏感）
  const tl = t.toLowerCase()
  if (tl.includes('major') || tl.includes('compulsory') || tl.includes('required') || tl.includes('core')) return 'cat-warn'
  if (tl.includes('general') || tl.includes('elective') || tl.includes('public') || tl.includes('common')) return 'cat-safe'
  return 'cat-unknown'
}

/** 课程类别是否为模糊类别（无法明确分类） */
export function courseCategoryIsFuzzy(catRaw: unknown): boolean {
  return enrollCategoryTdClass(catRaw) === 'cat-unknown'
}

/** 生成周课表单元格 ID，格式：`"mon-p34"` */
export function cellId(day: string, slot: string): string {
  return `${day}-${slot}`
}

/** 解析单元格 ID → { dayKey, slotKey } */
export function parseCellId(cellDataId: string): { dayKey: string; slotKey: string } {
  const s = String(cellDataId)
  const i = s.indexOf('-')
  if (i <= 0) return { dayKey: '', slotKey: '' }
  return { dayKey: s.slice(0, i), slotKey: s.slice(i + 1) }
}

/**
 * 按序号在课程列表中查找课程。
 * 注意：原代码中 byIndex 直接访问全局 enrollData，
 * 此处改为接收 courses 参数，保持纯函数。
 */
export function byIndex(n: unknown, courses: Course[]): Course | null {
  const i = parseInt(String(n == null ? '' : n).trim(), 10)
  if (!Number.isFinite(i) || i < 1) return null
  return courses.find((c) => Number(c.序号) === i) ?? null
}

/** 课程代号：统一使用教学班号 */
export function courseCodeFromRow(c: Course | null | undefined): string {
  if (!c) return ''
  return c.教学班号 != null ? String(c.教学班号).trim() : ''
}

/**
 * 合并三栏序号为存储字符串。
 * 格式：`"A|B|C"`，全空时返回 `""`。
 */
export function joinBands(a: unknown, b: unknown, c: unknown): string {
  const vals = [a, b, c].map((v) => String(v == null ? '' : v).trim())
  if (!vals[0] && !vals[1] && !vals[2]) return ''
  return vals.join('|')
}

/**
 * 拆分存储字符串为三栏序号。
 * 支持 `"A|B|C"` 格式；旧格式（空格分隔数字）也兼容。
 */
export function splitCellBands(v: unknown): [string, string, string] {
  const s = String(v == null ? '' : v).trim()
  if (!s) return ['', '', '']
  if (s.includes('|')) {
    const parts = s.split('|')
    return [
      String(parts[0] == null ? '' : parts[0]).trim(),
      String(parts[1] == null ? '' : parts[1]).trim(),
      String(parts[2] == null ? '' : parts[2]).trim(),
    ]
  }
  // 旧格式：空格分隔的数字序列
  const ids = parseCellIndexTokens(s)
  if (ids.length >= 3) return [String(ids[0]), String(ids[1]), String(ids[2])]
  if (ids.length === 2) return [String(ids[0]), String(ids[1]), '']
  if (ids.length === 1) return [String(ids[0]), '', '']
  return ['', '', '']
}

/** 解析单栏序号 token → 数字（无效返回 NaN，空返回 null） */
export function parseBandToken(v: unknown): number | null {
  const s = String(v == null ? '' : v).trim()
  if (!s) return null
  if (!/^\d{1,4}$/.test(s)) return NaN
  const n = parseInt(s, 10)
  if (!Number.isFinite(n) || n < 1) return NaN
  return n
}

// ── 内部辅助 ──────────────────────────────────

/** 从旧格式字符串中提取所有数字序号 token */
function parseCellIndexTokens(s: string): number[] {
  const tokens = s.split(/\s+/)
  const result: number[] = []
  for (const t of tokens) {
    const n = parseInt(t, 10)
    if (Number.isFinite(n) && n >= 1) result.push(n)
  }
  return result
}
