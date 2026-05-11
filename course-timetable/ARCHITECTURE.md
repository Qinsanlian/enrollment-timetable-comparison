# Enrollment & Timetable Comparison - 架构文档

## 项目概述
将原始单文件 HTML 课程表工具（约 5000 行内联 JS）逐步工程化为模块化的 TypeScript 项目。
采用**渐进式桥接**策略：新模块通过 `__tsBridge` 全局对象注入遗留代码，逐步替换旧实现。

## 分层架构

```
src/
├── types.ts                    # 第1层：类型定义
├── constants.ts                # 第1层：常量与配置
├── utils/helpers.ts            # 第2层：通用工具函数
├── core/                       # 第2层：纯业务逻辑
│   ├── course-model.ts         #   选课数据模型与处理
│   ├── schedule-parser.ts      #   上课时间解析器
│   └── slot-times.ts           #   课次时间计算引擎
├── state/                      # 第3层：状态管理与持久化
│   ├── storage-adapter.ts      #   localStorage 安全封装（带备份恢复）
│   ├── compliance-log.ts       #   合规操作日志（最多200条）
│   ├── slot-config-store.ts    #   课次时间配置持久化
│   ├── enroll-store.ts         #   选课数据持久化（中英文隔离）
│   ├── grid-store.ts           #   周课表数据持久化
│   └── app-state.ts            #   全局状态管理器（撤销/重做/订阅）
├── main.ts                     # 第4层：桥接入口，挂载 __tsBridge
└── legacy.js                   # 第5层：遗留 UI 代码
```

## 各层职责

### 第1层：类型与常量 (`types.ts`, `constants.ts`)
- 定义所有核心数据结构（`Course`, `EnrollData`, `GridModel`, `SlotTimeConfig`, `SlotPlacement` 等）。
- 导出不变配置（`DAYS`, `SLOTS`, `SLOT_TIME_DEFAULT`, `APP_VERSION`, 所有 `localStorage` 键名）。
- **依赖**：无。

### 第2层：纯函数 (`utils/helpers.ts`, `core/*.ts`)
- 纯计算逻辑，无副作用，不访问 DOM 或 `localStorage`。
- 可脱离浏览器环境独立测试。
- 包含工具函数（`escapeHtml`, `cellId`, `splitCellBands`）、课程模型（`normalizeEnrollShape`, `inferOnlineFlag`）、上课时间解析（`parseOneScheduleSegment`, `parseCourseToSchedulePlacements`）、课次时间计算（`computeSlotTimes`, `getSlotTimeDisplay`）。
- **依赖**：仅第1层。

### 第3层：状态管理 (`state/*.ts`)
- 封装所有副作用（`localStorage` 读写、`sessionStorage` 会话标记）。
- 提供数据持久化、备份恢复、合规日志、撤销/重做历史栈。
- 统一通过 `saveWithBackup` / `loadWithFallback` 保证数据安全。
- **依赖**：第1层 + 第2层。

### 第4层：桥接入口 (`main.ts`)
- 初始化所有模块，挂载到 `window.__tsBridge`。
- 动态导入 `legacy.js`，确保 bridge 先于遗留代码执行。
- **依赖**：第2层 + 第3层。

### 第5层：遗留 UI (`legacy.js`)
- 原始 DOM 操作、事件绑定、渲染逻辑（IIFE 封装）。
- 通过 `window.__tsBridge` 引用新模块的函数，逐步替换旧实现。
- 目标：体积持续缩小，最终退化为纯胶水代码或完全消失。

## 数据流向

```
用户操作
    ↓
legacy.js (事件处理)
    ↓
window.__tsBridge (调用新模块)
    ↓
core/ 或 state/ (纯逻辑或持久化)
    ↓
返回结果 → legacy.js (更新 DOM)
```

## 桥接层使用说明

`window.__tsBridge` 对象暴露了所有新模块的导出方法，包括：
- 工具函数：`escapeHtml`, `cellId`, `splitCellBands`, `normalizeCell` 等
- 时间解析：`computeSlotTimes`, `parseOneScheduleSegment`, `parseCourseToSchedulePlacements` 等
- 课程模型：`cloneEnroll`, `inferOnlineFlag`, `normalizeEnrollShape` 等
- 存储封装：`load`, `save`, `saveWithBackup`, `loadWithFallback`
- 状态读写：`loadSlotParams`, `saveSlotParams`, `loadGridFromStorage`, `writeGridStorage` 等
- 高级状态：`pushSnapshot`, `popUndo`, `popRedo`, `appendComplianceEvent` 等
- 常量：`DAYS`, `SLOTS`, `APP_VERSION`

在 `legacy.js` 中替换旧函数的标准模式：

```javascript
// 旧定义（注释掉）
// function escapeHtml(s) { ... }

// 新实现（桥接调用）
function escapeHtml(s) { return window.__tsBridge.escapeHtml(s); }
```

## 构建与运行

```bash
cd course-timetable
npm install
npm run dev       # 开发模式，访问 http://localhost:5173
npm run build     # 生产构建，输出到 dist/
```

## 外部依赖

三个外部库通过 CDN 加载（在 `index.html` 的 `<script>` 标签中引入）：
- `html2canvas 1.4.1`（PDF/打印截图）
- `jspdf 2.5.1`（PDF 生成）
- `xlsx 0.20.3`（Excel 解析）

这些库暴露为全局变量，在 `legacy.js` 中直接使用。不通过 npm 安装，避免 ESM 导出结构差异导致的兼容问题。

## 已迁移的函数

| 批次 | 函数 | 来源模块 | 状态 |
|------|------|----------|------|
| 1 | `escapeHtml`, `toHalfWidthChars`, `normalizeCell`, `parseOnlineField` | `utils/helpers.ts` | ✅ |
| 1 | `cellId`, `parseCellId`, `courseCodeFromRow`, `enrollCategoryTdClass` | `utils/helpers.ts` | ✅ |
| 1 | `joinBands`, `parseBandToken`, `courseCategoryIsFuzzy` | `utils/helpers.ts` | ✅ |
| 2 | `cloneEnroll`, `inferOnlineFlag`, `normalizeEnrollShape`, `finalizeCourseIndices` | `core/course-model.ts` | ✅ |
| 3 | `parseTimeHmToMinutes`, `formatMinutesToHm`, `addMinutes`, `computeSlotTimes` | `core/slot-times.ts` | ✅ |
| 3 | `normalizeSlotParamsObject` (→ `normalizeSlotParams`) | `core/slot-times.ts` | ✅ |
| 4 | `normalizeTimeToken`, `parseWeekdayKeyInText`, `formatWeekPatternDisplay` | `core/schedule-parser.ts` | ✅ |
| 4 | `normalizeScheduleSegmentForParse`, `normalizeCourseScheduleForAutofill` | `core/schedule-parser.ts` | ✅ |
| 4 | `slotLessonBounds`, `slotKeysCoveringLessonRange`, `parseOneScheduleSegment` | `core/schedule-parser.ts` | ✅ |
| 4 | `weekHintForCell`, `parseCourseToSchedulePlacements` | `core/schedule-parser.ts` | ✅ |

## 未来迁移计划

- **可替换**：`loadSlotTimesMap`（已是桥接函数的组合调用）
- **暂缓**：`loadEnrollFromStorage`, `writeGridStorage`, `readStoredActiveThirdBands` 等（依赖 legacy 内部全局变量，需整体迁移渲染层）
- **最终目标**：`legacy.js` 仅保留胶水代码，或完全消失
