// ─────────────────────────────────────────────
// src/state/enroll-store.ts
// 选课表数据的持久化读写（区分中英文存储键）
// ─────────────────────────────────────────────

import type { EnrollData } from '../types'
import {
  LS_KEY_ENROLL, LS_KEY_ENROLL_ZH, LS_KEY_ENROLL_EN,
  LS_KEY_UI_LANG,
} from '../constants'
import { loadWithFallback, saveWithBackup, safeJsonParse } from './storage-adapter'
import {
  cloneEnroll, createDefaultEnroll,
  normalizeEnrollShape, ENROLL_DEFAULT,
} from '../core/course-model'

/** 根据当前语言偏好返回对应的存储键 */
function enrollStorageKey(lang: string): string {
  if (lang === 'en') return LS_KEY_ENROLL_EN
  if (lang === 'zh') return LS_KEY_ENROLL_ZH
  return LS_KEY_ENROLL
}

/** 读取当前语言偏好（不依赖 DOM） */
function getStoredLang(): string {
  try { return localStorage.getItem(LS_KEY_UI_LANG) ?? '' } catch { return '' }
}

/** 从 localStorage 加载选课数据，失败返回 null */
export function loadEnrollFromStorage(lang?: string): EnrollData | null {
  const l = lang ?? getStoredLang()
  const tryLoad = (key: string): EnrollData | null => {
    const raw = loadWithFallback(key)
    if (!raw) return null
    const data = safeJsonParse<EnrollData | null>(raw, null)
    if (!data || !Array.isArray(data.headers) || !Array.isArray(data.courses)) return null
    if (!data.headers.length || !data.courses.length) return null
    return cloneEnroll(data)
  }
  // 优先读语言专属键，回退到通用键
  return tryLoad(enrollStorageKey(l)) ?? tryLoad(LS_KEY_ENROLL)
}

/**
 * 持久化选课数据。
 * flush=true 时立即写入（用于网课勾选、课程名编辑等需要即时保存的场景）。
 */
export function saveEnrollToStorage(data: EnrollData, flush = false): void {
  const l = getStoredLang()
  const key = enrollStorageKey(l)
  const serialized = JSON.stringify(data)
  if (flush) {
    saveWithBackup(key, serialized)
    saveWithBackup(LS_KEY_ENROLL, serialized)
  } else {
    saveWithBackup(key, serialized)
  }
}

/** 立即强制写入（不防抖） */
export function flushEnrollSaveNow(data: EnrollData): void {
  saveEnrollToStorage(data, true)
}

/** 返回默认内嵌范本（不读 localStorage） */
export function getDefaultEnroll(lang: string): EnrollData {
  return createDefaultEnroll(lang)
}

/**
 * 加载选课数据，失败时回退到默认范本。
 * 同时执行 normalizeEnrollShape 确保字段完整。
 */
export function loadOrDefaultEnroll(lang: string): EnrollData {
  const stored = loadEnrollFromStorage(lang)
  if (stored) {
    normalizeEnrollShape(stored, { restoredFromStorage: true })
    return stored
  }
  const def = createDefaultEnroll(lang)
  normalizeEnrollShape(def)
  return def
}

/** 获取选课表来源标签（文件名或"内嵌范本"） */
export function getEnrollSourceLabel(lang: string): string {
  try {
    const key = lang === 'en' ? 'courseScheduleEnrollImportMetaV1_en' : 'courseScheduleEnrollImportMetaV1_zh'
    const raw = localStorage.getItem(key)
    if (!raw) return ''
    const meta = safeJsonParse<{ fileName?: string }>(raw, {})
    return meta.fileName ?? ''
  } catch {
    return ''
  }
}

/** 计算学分合计（字符串学分字段，容错处理） */
export function sumCredits(courses: EnrollData['courses']): number {
  return courses.reduce((acc, c) => {
    const n = parseFloat(String(c.学分 ?? '').replace(/[^\d.]/g, ''))
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
}

/** 获取选课表的学年学期元数据 */
export function getEnrollTermMeta(
  courses: EnrollData['courses'],
  lang: string,
): { year: string; term: string } {
  const first = courses[0]
  if (!first) return { year: '—', term: '—' }
  const year = String(first.学年 ?? '—')
  const termRaw = String(first.学期 ?? '')
  if (lang === 'en') {
    const termLabel = termRaw === '1' ? 'Term 1' : termRaw === '2' ? 'Term 2' : termRaw
    return { year, term: termLabel }
  }
  const termLabel = termRaw === '1' ? '第一学期' : termRaw === '2' ? '第二学期' : termRaw
  return { year, term: termLabel }
}

// 确保 ENROLL_DEFAULT 可从此模块访问（方便其他模块统一从 enroll-store 导入）
export { ENROLL_DEFAULT }
