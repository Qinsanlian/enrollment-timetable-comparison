// ─────────────────────────────────────────────
// src/state/compliance-log.ts
// 合规操作日志：持久化到 localStorage，最多保留 200 条
// ─────────────────────────────────────────────

import { LS_KEY_COMPLIANCE_LOG, SESSION_KEY_SERVICE_CONSENT_NAME_HASH } from '../constants'
import { loadWithFallback, saveWithBackup, safeJsonParse } from './storage-adapter'

export interface LogEntry {
  ts: number
  type: string
  payload?: unknown
  sessionHash: string
}

const MAX_ENTRIES = 200

function getSessionHash(): string {
  try {
    return sessionStorage.getItem(SESSION_KEY_SERVICE_CONSENT_NAME_HASH) ?? 'not-authenticated'
  } catch {
    return 'not-authenticated'
  }
}

function readEntries(): LogEntry[] {
  const raw = loadWithFallback(LS_KEY_COMPLIANCE_LOG)
  const arr = safeJsonParse<unknown>(raw, [])
  return Array.isArray(arr) ? (arr as LogEntry[]) : []
}

function writeEntries(entries: LogEntry[]): void {
  saveWithBackup(LS_KEY_COMPLIANCE_LOG, JSON.stringify(entries))
}

/** 追加一条合规日志 */
export function appendComplianceEvent(type: string, payload?: unknown): void {
  const entries = readEntries()
  entries.push({ ts: Date.now(), type, payload, sessionHash: getSessionHash() })
  // 超出上限时删最旧的
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES)
  writeEntries(entries)
}

/** 获取所有日志条目（最新在后） */
export function getComplianceEntries(): LogEntry[] {
  return readEntries()
}

/** 清空日志 */
export function clearComplianceLog(): void {
  writeEntries([])
}
