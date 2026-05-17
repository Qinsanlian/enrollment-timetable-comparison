# 选课&课表对照单

> 将教务选课表一键转换为 A3 版芯周课表，支持中英文双语、自动填格、导出 PDF / 打印申请包。

[![在线使用](https://img.shields.io/badge/在线使用-GitHub%20Pages-blue)](https://qinsanlian.github.io/enrollment-timetable-comparison/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green)](./LICENSE)

---

## 📌 项目简介

本工具为国际学生（及有双语课表需求的师生）设计，解决从教务系统导出的 Excel 选课表到可视化周课表的排版难题。  
- **无需安装**：浏览器打开即用  
- **数据安全**：所有数据保存在你的浏览器本地（localStorage），不上传任何内容  
- **排版合规**：导出文件带“非官方排版对照件”水印，并强制确认使用责任  

---

## ✨ 主要功能

| 模块 | 功能 |
|------|------|
| **选课表管理** | 导入教务 Excel（无表头 10 列或带表头变体）、下载中英文示例、课程名称就地编辑、网课标记 |
| **周课表** | 周一至周日，每格三栏递进填写选课序号，自动显示课程名称、时间、地点、教学班号、周次提示 |
| **自动填格** | 解析“上课时间”字段，智能填入对应格子（上栏→中栏→下栏） |
| **课次时间计算** | 自定义每日开始时间、课时长、休息间隔，实时重算所有时段 |
| **撤销 / 重做** | 支持 Ctrl+Z / Ctrl+Y，历史栈最多 60 步 |
| **导出与打印** | 浏览器打印（A3）、双语 PDF（中英文各一页 A3）、申请包（封面信息页 + A3 课表） |
| **校徽水印** | 上传校徽图片，自动转为半透明水印叠加于 A3 版芯及 PDF |
| **合规与隐私** | 导出前强制输入确认短语、姓名 SHA‑256 哈希仅存 sessionStorage、所有文件标注“非官方” |
| **中英文界面** | 一键切换语言（中文/英文/跟随浏览器），课表表头同步翻译 |
| **数据持久化** | 自动保存至 localStorage，刷新不丢失，支持一键清除全部缓存 |

---

## 🖼️ 界面预览

> 以下为截图示例（实际界面以在线版本为准）

| zh-视图 | en-视图 |
|-----------|-----------|
| ![选课表](./docs/images/enroll-table.png) | ![周课表](./docs/images/weekly-grid.png) |

| 导出前检查模态框 | 申请包封面页 |
|----------------|-------------|
| ![检查清单](./docs/images/export-check.png) | ![申请包](./docs/images/package-cover.png) |

---

## 🚀 快速开始

### 在线使用（推荐）
直接访问 **[https://qinsanlian.github.io/enrollment-timetable-comparison/](https://qinsanlian.github.io/enrollment-timetable-comparison/)**  

### 本地开发运行
```bash
git clone https://github.com/Qinsanlian/enrollment-timetable-comparison.git
cd enrollment-timetable-comparison/course-timetable
npm install
npm run dev
```
浏览器打开 `http://localhost:5173` 即可。

---

## 📖 使用说明

### 1. 选课表操作
- **导入 Excel**：点击侧栏“导入 Excel…”，选择教务导出的选课表（支持 `.xlsx` / `.xls` / `.csv`）。  
  系统会自动识别“无表头 10 列”或“带表头”格式，并根据课程名/类别/时空字段推断是否为网课。  
- **下载示例**：若不确定格式，可先点击“下载中文/英文选课表示例”，参照该模板整理数据。  
- **手动编辑**：表格内的课程名称可直接双击修改（中文界面修改中文名，英文界面修改英文名）。  
- **网课标记**：勾选“网课”列复选框后，该课程将不会参与周课表自动填格，序号前会显示 `*`。

### 2. 周课表编辑
- 每个格子分为**上、中、下三栏**，对应输入选课表里的序号。  
- 只填一栏时，格子自动居中显示该课程信息；填两栏时显示为上下两课（中间有虚线分隔）。  
- 点击格子右上角的 `+` 按钮可激活第三栏（需先填写中栏）。  
- 点击 `-` 按钮可移除第三栏并清空其序号。

### 3. 自动填格
- 点击“按上课时间自动填格”，系统会解析每门课程的“上课时间”字段，将序号填入对应的星期·节次格子。  
- 填格规则：上栏空则填上栏；上栏有、中栏空则填中栏；上中都有、下栏空则填下栏并自动激活第三栏。  
- 若某格已有三门课程且三栏已满，后续课程会被跳过，格子左上角会出现红色 `+N` 徽章，鼠标悬停可查看具体未填入的课程。

### 4. 课次时间自定义
- 在侧栏“课次时间计算器”中可修改：
  - 每日课程开始时间（如 `08:00`）
  - 每节课时长（分钟）
  - 课中休息、课间休息、午休、傍晚休息时长
- 点击“计算并应用”后，周课表所有格子的时段会立即更新。

### 5. 导出与打印
- **打印 / PDF**：浏览器打印对话框（建议选择 A3 纸张、缩放 100%、关闭页眉页脚），会自动附加“非官方排版对照件”文字水印。  
- **导出 PDF (A3 双语)**：生成两份 A3 版芯（中文页 + 英文页），合并为一个 PDF 文件。  
- **导出申请包**：生成包含封面信息页（含数据一致性声明）和 A3 课表的 PDF，适合作为选课材料提交。  
- **所有导出操作前**都会弹出“导出前自查清单”，并随机生成一句确认短语，用户需逐字输入后方可继续。

### 6. 校徽水印
- 点击侧栏“导入校徽图片”，选择一张彩色图片（建议方形或圆形）。  
- 图片会自动转为半透明、降低饱和度，并居中显示于 A3 版芯上。  
- 导出 PDF 时水印也会一并输出。  
- 点击“移除水印”可清除。

### 7. 数据备份与恢复
- **清除全部数据**：点击“清除本机全部缓存数据”会删除所有 localStorage 数据并刷新页面。清除前会提示是否下载 JSON 备份。  
- **导入备份文件**：可将之前导出的 JSON 备份重新加载，恢复选课表、周课表、语言偏好等。

---

## 🛠️ 技术栈

| 类别         | 技术                          |
|-------------|-------------------------------|
| 构建工具     | Vite 6                        |
| 类型系统     | TypeScript 5.6（严格模式）     |
| 样式         | 原生 CSS（CSS 变量 + A3 物理尺寸） |
| PDF 生成     | jsPDF 2.5.1（CDN）            |
| Canvas 截图  | html2canvas 1.4.1（CDN）      |
| Excel 解析   | SheetJS (xlsx) 0.20.3（CDN）  |
| 测试框架     | Vitest + Happy‑DOM             |
| 部署         | GitHub Pages + GitHub Actions |

---

## 📁 项目结构

```
course-timetable/
├── index.html              # Vite 入口 HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts             # 桥接入口，挂载 window.__tsBridge
    ├── types.ts            # 核心 TypeScript 类型定义
    ├── constants.ts        # 全局常量（DAYS, SLOTS, LS_KEY 等）
    ├── styles/
    │   └── main.css        # 完整样式（A3 布局、打印、响应式）
    ├── utils/
    │   ├── helpers.ts       # 通用工具函数
    │   └── watermark.ts     # 图片水印处理模块
    ├── core/
    │   ├── course-model.ts  # 选课数据模型与处理
    │   ├── schedule-parser.ts # 上课时间解析器
    │   ├── slot-times.ts    # 课次时间计算引擎
    │   └── autofill.ts      # 自动填格核心算法（纯函数）
    ├── state/
    │   ├── storage-adapter.ts    # localStorage 安全封装
    │   ├── compliance-log.ts     # 合规操作日志
    │   ├── slot-config-store.ts  # 课次时间配置持久化
    │   ├── enroll-store.ts       # 选课数据持久化
    │   ├── grid-store.ts         # 周课表数据持久化
    │   └── app-state.ts          # 全局状态管理器（撤销/重做）
    └── legacy.js            # UI 事件与渲染逻辑（逐步迁移中）
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. **Fork** 本仓库  
2. 创建特性分支 `git checkout -b feature/your-feature`  
3. 提交修改 `git commit -m 'feat: add something'`  
4. 推送到分支 `git push origin feature/your-feature`  
5. 发起 Pull Request  

请确保提交前运行 `npm run build` 构建通过，并尽量保持代码风格与现有模块一致。

---

## 📄 许可证

[Apache License 2.0](./LICENSE)

---

## 🙏 致谢

- [鱼皮编程导航](https://www.codefather.cn/) 提供的项目灵感  
- 所有参与测试和反馈的用户  
- 感谢国家和社会提供的安全环境，让合规开发成为可能  

---

## 📮 反馈与支持

- **报告 Bug / 功能建议**：请在 GitHub [Issues](https://github.com/Qinsanlian/enrollment-timetable-comparison/issues) 中提交  
- **使用疑问**：可先查阅 [FAQ](./docs/FAQ.md)（待补充）  
- **紧急联系**：通过项目主页的“反馈”按钮（侧栏底部）发送消息  

---

> **免责声明**：本工具仅供排版辅助，所有数据的真实性由使用者负责。导出文件均标注“非官方排版对照件”，不作为学校正式文件。
