// ─────────────────────────────────────────────
// src/state/storage-adapter.ts
// 安全的 localStorage 封装，统一处理读写异常和备份键
// ─────────────────────────────────────────────

export const STORAGE_BACKUP_SUFFIX = '__bak'

export function backupKey(key: string): string {
  return key + STORAGE_BACKUP_SUFFIX
}

export function load(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function save(key: string, data: string): void {
  try { localStorage.setItem(key, data) } catch { /* quota exceeded – ignore */ }
}

export function remove(key: string): void {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

/** 写主键同时写备份键 */
export function saveWithBackup(key: string, data: string): void {
  save(key, data)
  save(backupKey(key), data)
}

/** 读主键，失败时回退到备份键 */
export function loadWithFallback(key: string): string | null {
  const v = load(key)
  if (v !== null) return v
  return load(backupKey(key))
}

/** 批量删除键及其备份键 */
export function clearAllKeys(keys: string[]): void {
  keys.forEach((k) => {
    remove(k)
    remove(backupKey(k))
  })
}

/** 安全 JSON 解析，失败返回 fallback */
export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}
