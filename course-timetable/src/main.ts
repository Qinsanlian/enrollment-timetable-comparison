// ─────────────────────────────────────────────
// 入口文件（空壳）
// 第一阶段仅导入样式，验证构建链路可用。
// 业务逻辑将在后续阶段逐步迁移。
// ─────────────────────────────────────────────

import './styles/main.css'
import { APP_VERSION, DAYS, SLOTS } from './constants'

// 开发阶段：在控制台输出基础信息，确认模块加载正常
console.info(`[course-timetable] ${APP_VERSION} — ${DAYS.length} days × ${SLOTS.length} slots`)
