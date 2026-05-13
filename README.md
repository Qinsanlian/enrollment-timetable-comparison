```markdown
# 选课&课表对照单

一个纯前端的课程表排版工具，帮助国际学生将教务 Excel 选课表转化为清晰、美观的 A3 版芯周课表，支持中英文双语、手动编辑、自动填格、合规水印和一键导出 PDF。

## 功能概览

- **选课表管理**：内嵌中英文范本（各 20 门课程），支持导入教务 Excel（无表头 10 列或带表头变体）、下载示例、课程名称就地编辑、网课标记。
- **周课表**：周一至周日，每格三栏递进填写选课序号，自动显示课程信息（名称、时间、地点、代号、周次提示），支持 `+` / `-` 按钮控制第三栏。
- **按上课时间自动填格**：解析选课表中“上课时间”字段（支持中文、英文及多种节次写法），自动将序号填入对应格子。
- **课次时间计算**：可自定义每日开始时间、每节课时长、课间休息、午休和傍晚休息，自动重算所有时段。
- **撤销与重做**：支持 Ctrl+Z / Ctrl+Y，历史栈最深 60 步。
- **导出与打印**：
  - 浏览器打印（A3 竖向，带“非官方排版对照件”水印）
  - 导出双语 PDF（中文 + 英文各一页 A3）
  - 导出申请包（封面信息页 + A3 课表，含数据一致性声明）
- **校徽图片水印**：支持上传彩色图片作为半透明水印，叠加于 A3 版芯及所有导出 PDF。
- **合规与隐私**：
  - 导出前强制输入确认短语，明确使用者责任
  - 所有文件标注“非官方排版对照件”
  - 姓名使用 SHA-256 哈希，仅存于 sessionStorage，标签页关闭即清除
- **中英文双语界面**：界面语言可切换（中文/英文/跟随浏览器），选课表和周课表表头同步翻译。
- **数据持久化**：所有数据通过 localStorage 自动保存，支持主键与备份键双写，刷新不丢失，清除缓存可恢复初始状态。
- **翻译检测**：检测到浏览器翻译时自动阻止导出并弹出提示弹窗，防止布局错乱。

## 快速开始

### 在线使用
直接访问：**[https://qinsanlian.github.io/enrollment-timetable-comparison/](https://qinsanlian.github.io/enrollment-timetable-comparison/)**

浏览器打开即用，无需安装任何软件。

### 本地开发
```bash
# 克隆仓库
git clone https://github.com/Qinsanlian/enrollment-timetable-comparison.git
cd enrollment-timetable-comparison/course-timetable

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build
```

启动后浏览器访问 `http://localhost:5173` 即可进入开发模式。

## 技术栈

| 层级 | 技术 |
|------|------|
| 构建工具 | Vite 6 |
| 类型系统 | TypeScript 5.6（严格模式） |
| 样式 | 纯 CSS（CSS 变量 + A3 物理尺寸） |
| PDF 生成 | jsPDF 2.5.1（CDN） |
| Canvas 截图 | html2canvas 1.4.1（CDN） |
| Excel 解析 | SheetJS (xlsx) 0.20.3（CDN） |
| 部署 | GitHub Pages + GitHub Actions |

## 项目结构

```
course-timetable/
├── index.html              # Vite 入口 HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts             # 桥接入口，挂载 window.__tsBridge
    ├── types.ts            # 核心 TypeScript 类型定义
    ├── constants.ts         # 全局常量（DAYS, SLOTS, LS_KEY 等）
    ├── styles/
    │   └── main.css        # 完整样式（A3 布局、打印、响应式）
    ├── utils/
    │   ├── helpers.ts       # 通用工具函数
    │   └── watermark.ts     # 图片水印处理模块
    ├── core/
    │   ├── course-model.ts  # 选课数据模型与处理
    │   ├── schedule-parser.ts # 上课时间解析器
    │   └── slot-times.ts    # 课次时间计算引擎
    ├── state/
    │   ├── storage-adapter.ts    # localStorage 安全封装
    │   ├── compliance-log.ts     # 合规操作日志
    │   ├── slot-config-store.ts  # 课次时间配置持久化
    │   ├── enroll-store.ts       # 选课数据持久化
    │   ├── grid-store.ts         # 周课表数据持久化
    │   └── app-state.ts          # 全局状态管理器（撤销/重做）
    └── legacy.js            # 遗留 UI 代码（逐步迁移中）
```

## 架构说明

本项目采用**渐进式桥接**策略，将原始单文件 HTML（约 5000 行）逐步工程化为模块化的 TypeScript 项目。

- **五层架构**：`types/constants` → `utils/core` → `state` → `main.ts（桥接入口）` → `legacy.js（遗留 UI）`
- 新模块通过 `window.__tsBridge` 暴露接口，遗留代码通过 `const fn = window.__tsBridge.fn` 引用。
- 目标是逐步将 `legacy.js` 中的 DOM 操作和事件绑定迁移到 TypeScript 模块，最终实现完全模块化。

详细架构文档见 [ARCHITECTURE.md](./course-timetable/ARCHITECTURE.md)。

## 构建与部署

本项目使用 GitHub Actions 自动部署到 GitHub Pages。每次推送到 `main` 或 `engineering-phase1` 分支时，Workflow 会自动：

1. 安装依赖
2. 构建生产版本
3. 部署到 GitHub Pages

部署配置文件位于 `.github/workflows/deploy.yml`。

## 使用说明

### 1. 选课表
- 启动后默认加载内嵌范本（20 门课程）
- 点击“下载中文/英文选课表示例”可获取标准格式的 Excel 文件
- 点击“导入 Excel…”可选择教务导出的课表文件导入
- 课程名称可双击直接编辑，修改后自动保存
- 网课（序号前带 `*`）不参与周课表自动填格

### 2. 周课表
- 每个格子有上、中、下三栏序号输入框
- 输入有效序号后，格子自动显示课程详细信息
- 导入 Excel 后会自动弹出“是否一键填格”提示
- 也可手动点击“按上课时间自动填格”
- 三栏已满的格子，溢出课程会以红色 `+N` 徽章标记

### 3. 导出
- **打印 / PDF**：按 A3 纸张打印预览，带合规水印
- **导出 PDF (A3 双语)**：在此之前，请分别确认中文和英文课表都已经填写完毕，导出前需输入确认短语
- **导出申请包**：生成带有封面信息页和 A3 课表的完整申请材料

### 4. 校徽水印
- 在侧栏“操作”区域点击“导入校徽图片”
- 选择一张彩色图片（建议方形或圆形）
- 图片将自动转化为半透明水印，叠加在 A3 版芯上
- 导出 PDF 时水印也会一并输出
- 点击“移除水印”可清除

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- **Issue**：报告 Bug、提出新功能建议、改进文档
- **PR**：Fork 本仓库 → 创建特性分支 → 提交修改 → 推送到你的 Fork → 发起 Pull Request
- 提交前请运行 `npm run build` 确保构建通过

## 许可证

Apache License 2.0

## 致谢

本工具在设计和开发过程中参考了以下资源：
- [鱼皮编程导航](https://www.codefather.cn/) 提供的项目灵感和实践指导
- 感谢所有参与测试和提供反馈的用户
- 感谢国家和社会提供的安全环境，让合规开发成为可能
```

这份 README 包含了项目概述、功能列表、在线地址、本地开发方式、技术栈、项目结构、使用说明、部署方式、贡献指南和许可证信息。你可以用它在 GitHub 上替换现有文件，也可以根据需要进行调整。
