// legacy.js — 原始内联 JS 过渡层（渐进式重构桥接）
// 库依赖由 index.html 的 CDN script 标签加载，此处直接使用全局变量

    (function (window, document) {
      "use strict";
      window.CourseTable = window.CourseTable || {};
      const CourseTable = window.CourseTable;
      CourseTable.utils = {
        debounce(fn, wait) {
          let t = null;
          return function debounced() {
            const ctx = this;
            const args = arguments;
            if (t) clearTimeout(t);
            t = setTimeout(function () {
              t = null;
              fn.apply(ctx, args);
            }, wait);
          };
        },
        nextFrame() {
          return new Promise(function (resolve) {
            requestAnimationFrame(function () {
              resolve();
            });
          });
        },
        safeJsonParse(raw, fallback) {
          try {
            if (raw == null || raw === "") return fallback;
            return JSON.parse(raw);
          } catch (_e) {
            return fallback;
          }
        },
        chunkedRafIterate(items, fn, chunkSize, onProgress) {
          const list = Array.isArray(items) ? items : [];
          const chunk = Math.max(1, Number(chunkSize) || 8);
          return new Promise(function (resolve) {
            let i = 0;
            function step() {
              const end = Math.min(i + chunk, list.length);
              for (; i < end; i++) fn(list[i], i);
              if (onProgress) onProgress(i, list.length);
              if (i >= list.length) {
                resolve();
                return;
              }
              requestAnimationFrame(step);
            }
            if (!list.length) {
              resolve();
              return;
            }
            requestAnimationFrame(step);
          });
        }
      };
    /*
     * 选课表数据规范（内存与页面表格；教务 Excel 另有固定布局见下）
     * 教务「选课表.xlsx」与本页下载文件：无表头行，仅 10 列 A～J 数据行 — 学年、学期、课程名称、开课学院、课程类别、学分、教学班号、任课教师、上课时间、上课地点。
     * 导入另支持「首行为表头」的旧式表（含「课程名称」列名及可选序号、网课、课程代号列）。
     * headers: string[]           页面选课表列名（含网课；与教务 10 列文件不是同一套列）
     * courses: object[]           每门课一行
     *   序号: number              正整数唯一；教务无序号列时由 finalizeCourseIndices 自动编排
     *   学年 / 学期 / 课程名称 / 开课学院 / 课程类别 / 学分 / 教学班号 / 任课教师 / 上课时间 / 上课地点
     *   网课: boolean              教务 xlsx 无此列时按课程名、教师关键字推断；true 时不参与周课表与自动填格
     */
    /** 工具版本号，全局唯一，导出申请包时引用此常量 */
    const APP_VERSION = "v1.1.3";

    /** 内嵌选课表范本（与教务「选课表.xlsx」数据列一致；内存中另含序号、网课） */
    const ENROLL_DEFAULT = {
      headers: [
        "学年",
        "学期",
        "课程名称",
        "开课学院",
        "课程类别",
        "学分",
        "教学班号",
        "任课教师",
        "上课时间",
        "上课地点",
        "网课"
      ],
      courses: [
        {
          序号: 1,
          学年: "2025-2026",
          学期: "1",
          课程名称: "大学英语（2）",
          开课学院: "通识教育教学部",
          课程类别: "公共必修课",
          学分: "2",
          教学班号: "(2025-2026-1)-T0000008-03",
          任课教师: "李华",
          上课时间: "星期二第1-2节{2-18周};星期四第3-4节{2-18周}",
          上课地点: "多(B-201);多(B-201)",
          网课: false
        },
        {
          序号: 2,
          学年: "2025-2026",
          学期: "1",
          课程名称: "人工智能与信息社会（尔雅）",
          开课学院: "通识教育教学部",
          课程类别: "公共选修课",
          学分: "1",
          教学班号: "(2025-2026-1)-13000521-01",
          任课教师: "超星尔雅",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 3,
          学年: "2025-2026",
          学期: "1",
          课程名称: "大学生心理健康教育（二）",
          开课学院: "心理健康教育中心",
          课程类别: "公共必修课",
          学分: "1.2",
          教学班号: "(2025-2026-1)-J0000012-11",
          任课教师: "王丽",
          上课时间: "星期一第5-6节{2-19周}",
          上课地点: "多(B-330)",
          网课: false
        },
        {
          序号: 4,
          学年: "2025-2026",
          学期: "1",
          课程名称: "社会实践",
          开课学院: "学工部（处）、人武部",
          课程类别: "实践环节",
          学分: "1.5",
          教学班号: "(2025-2026-1)-J0000005-15",
          任课教师: "张强",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 5,
          学年: "2025-2026",
          学期: "1",
          课程名称: "有机化学实验",
          开课学院: "检验检测认证学院",
          课程类别: "专业必修课",
          学分: "1",
          教学班号: "(2025-2026-1)-R24H0003-02",
          任课教师: "刘洋,陈静",
          上课时间: "星期四第9-10节{3-18周}",
          上课地点: "多(C-215)",
          网课: false
        },
        {
          序号: 6,
          学年: "2025-2026",
          学期: "1",
          课程名称: "英语（3-2）",
          开课学院: "通识教育教学部",
          课程类别: "公共必修课",
          学分: "1",
          教学班号: "(2025-2026-1)-T0000047-05",
          任课教师: "赵刚",
          上课时间: "星期三第3-4节{2-19周};星期五第1-2节{2-19周}",
          上课地点: "阶4;阶4",
          网课: false
        },
        {
          序号: 7,
          学年: "2025-2026",
          学期: "1",
          课程名称: "形势与政策（6-2）",
          开课学院: "马克思主义学院",
          课程类别: "公共必修课",
          学分: "1.1",
          教学班号: "(2025-2026-1)-M0000035-08",
          任课教师: "孙红",
          上课时间: "星期六第1-2节{4周,9周,14周}",
          上课地点: "多(A-401)",
          网课: false
        },
        {
          序号: 8,
          学年: "2025-2026",
          学期: "1",
          课程名称: "创业实务",
          开课学院: "创新创业学院",
          课程类别: "公共必修课",
          学分: "1.3",
          教学班号: "(2025-2026-1)-N0000002-06",
          任课教师: "周涛",
          上课时间: "星期二第7-8节{1-18周}",
          上课地点: "多(B-204)",
          网课: false
        },
        {
          序号: 9,
          学年: "2025-2026",
          学期: "1",
          课程名称: "职业沟通与礼仪",
          开课学院: "通识教育教学部",
          课程类别: "公共必修课",
          学分: "1.4",
          教学班号: "(2025-2026-1)-T0000010-04",
          任课教师: "吴芳",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 10,
          学年: "2025-2026",
          学期: "1",
          课程名称: "机械制图",
          开课学院: "智能制造学院",
          课程类别: "专业必修课",
          学分: "3",
          教学班号: "(2025-2026-1)-R05H0101-01",
          任课教师: "马超",
          上课时间: "星期一第9-10节{2-19周}",
          上课地点: "多(A-512)",
          网课: false
        },
        {
          序号: 11,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Python入门(网络课)",
          开课学院: "通识教育教学部",
          课程类别: "网络公共选修课",
          学分: "1",
          教学班号: "(2025-2026-1)-G0000020-02",
          任课教师: "金蕾",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 12,
          学年: "2025-2026",
          学期: "1",
          课程名称: "高等数学（2-1）",
          开课学院: "通识教育教学部",
          课程类别: "公共必修课",
          学分: "5",
          教学班号: "(2025-2026-1)-T0000006-05",
          任课教师: "郑丽",
          上课时间: "星期四第5-6节{2-19周};星期二第1-2节{2-19周}",
          上课地点: "多(B-416);多(B-416)",
          网课: false
        },
        {
          序号: 13,
          学年: "2025-2026",
          学期: "1",
          课程名称: "口才艺术与社交礼仪（尔雅）",
          开课学院: "通识教育教学部",
          课程类别: "公共选修课",
          学分: "1",
          教学班号: "(2025-2026-1)-13000775-01",
          任课教师: "超星尔雅",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 14,
          学年: "2025-2026",
          学期: "1",
          课程名称: "创新创业大赛实战（尔雅）",
          开课学院: "通识教育教学部",
          课程类别: "院三创教育",
          学分: "2",
          教学班号: "(2025-2026-1)-13000724-01",
          任课教师: "超星尔雅",
          上课时间: "星期五第5-6节{2-17周}",
          上课地点: "",
          网课: true
        },
        {
          序号: 15,
          学年: "2025-2026",
          学期: "1",
          课程名称: "思想道德与法治",
          开课学院: "马克思主义学院",
          课程类别: "公共必修课",
          学分: "3.5",
          教学班号: "(2025-2026-1)-M0000002-10",
          任课教师: "杨帆",
          上课时间: "星期二第3-4节{11-12周};星期五第9-10节{15-16周}",
          上课地点: "阶6;多(A-307)",
          网课: false
        },
        {
          序号: 16,
          学年: "2025-2026",
          学期: "1",
          课程名称: "入学教育与军训",
          开课学院: "学工部（处）、人武部",
          课程类别: "实践环节",
          学分: "2",
          教学班号: "(2025-2026-1)-J0000004-82",
          任课教师: "陈刚",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 17,
          学年: "2025-2026",
          学期: "1",
          课程名称: "篮球1",
          开课学院: "体育与健康管理学院",
          课程类别: "公共必修课",
          学分: "1",
          教学班号: "(2025-2026-1)-K0000109-03",
          任课教师: "黄健",
          上课时间: "星期四第7-8节{1-9周,11-20周}",
          上课地点: "体育馆201",
          网课: false
        },
        {
          序号: 18,
          学年: "2025-2026",
          学期: "1",
          课程名称: "大学生心理健康教育（一）",
          开课学院: "心理健康教育中心",
          课程类别: "公共必修课",
          学分: "1.2",
          教学班号: "(2025-2026-1)-J0000011-44",
          任课教师: "徐雪萍",
          上课时间: "星期一第1-2节{2-19周}",
          上课地点: "多(B-328)",
          网课: false
        },
        {
          序号: 19,
          学年: "2025-2026",
          学期: "1",
          课程名称: "世界古代文明（尔雅）",
          开课学院: "通识教育教学部",
          课程类别: "公共选修课",
          学分: "1",
          教学班号: "(2025-2026-1)-13000662-01",
          任课教师: "超星尔雅",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 20,
          学年: "2025-2026",
          学期: "1",
          课程名称: "分析化学",
          开课学院: "检验检测认证学院",
          课程类别: "专业必修课",
          学分: "1.5",
          教学班号: "(2025-2026-1)-R24H0004-06",
          任课教师: "林强,王乾",
          上课时间: "星期三第9-10节{2-19周}",
          上课地点: "多(B-518)",
          网课: false
        }
      ]
    };

    /**
     * 教务「选课表.xlsx」与本页下载文件：无表头行，固定 10 列 A～J，顺序不可变。
     * A 学年 · B 学期 · C 课程名称 · D 开课学院 · E 课程类别 · F 学分 · G 教学班号 · H 任课教师 · I 上课时间 · J 上课地点
     * （文件中无序号、网课列；导入时序号自动编、网课按课程名/教师关键字推断。）
     */
    const ENROLL_XLSX_FIXED_COLS = [
      "学年",
      "学期",
      "课程名称",
      "开课学院",
      "课程类别",
      "学分",
      "教学班号",
      "任课教师",
      "上课时间",
      "上课地点"
    ];

    /** 表头单元格：去 BOM、零宽、全角空格后去空白，用于列名匹配 */
    function normalizeHeaderLabel(raw) {
      if (raw == null) return "";
      let s = String(raw).replace(/^\ufeff/, "");
      s = s.replace(/[\u200b-\u200d\ufeff]/g, "");
      s = s.replace(/\u3000/g, "");
      s = s.replace(/\s+/g, "");
      return s;
    }

    /** 学校导出表头常见别名 → 内部统一列名（与 ENROLL_DEFAULT.headers 一致） */
    const EXCEL_HEADER_ALIAS_TO_CANONICAL = (() => {
      const m = Object.create(null);
      const add = (alias, canon) => {
        const k = normalizeHeaderLabel(alias);
        if (k && m[k] === undefined) m[k] = canon;
      };
      ENROLL_DEFAULT.headers.forEach((h) => add(h, h));
      add("选课序号", "序号");
      add("课序号", "序号");
      add("课程名", "课程名称");
      add("授课时间", "上课时间");
      add("教学时间", "上课时间");
      add("上课时间安排", "上课时间");
      add("上课教室", "上课地点");
      add("教室", "上课地点");
      add("地点", "上课地点");
      add("教学班", "教学班号");
      add("班级代码", "教学班号");
      add("开课学期", "学期");
      add("教师", "任课教师");
      add("主讲教师", "任课教师");
      add("授课教师", "任课教师");
      add("是否网课", "网课");
      add("网络课程", "网课");
      add("在线课程", "网课");
      // English column name aliases
      add("Academic Year", "学年");
      add("AcademicYear", "学年");
      add("Term", "学期");
      add("Semester", "学期");
      add("Course Name", "课程名称");
      add("CourseName", "课程名称");
      add("Course Name (EN)", "课程名称");
      add("CourseNameEN", "课程名称");
      add("School / College", "开课学院");
      add("School/College", "开课学院");
      add("Affiliated College", "开课学院");
      add("AffiliatedCollege", "开课学院");
      add("College", "开课学院");
      add("School", "开课学院");
      add("Category", "课程类别");
      add("Course Category", "课程类别");
      add("CourseCategory", "课程类别");
      add("Credits", "学分");
      add("Credit", "学分");
      add("Class Section ID", "教学班号");
      add("ClassSectionID", "教学班号");
      add("Class Section", "教学班号");
      add("Section ID", "教学班号");
      add("Instructor", "任课教师");
      add("Teacher", "任课教师");
      add("Class Time", "上课时间");
      add("ClassTime", "上课时间");
      add("Schedule", "上课时间");
      add("Classroom / Venue", "上课地点");
      add("Classroom/Venue", "上课地点");
      add("Classroom", "上课地点");
      add("Venue", "上课地点");
      add("Location", "上课地点");
      add("Online", "网课");
      add("Is Online", "网课");
      add("IsOnline", "网课");
      return m;
    })();

    function mapExcelHeaderToCanonical(cellText) {
      const s = normalizeHeaderLabel(cellText);
      if (!s) return null;
      const hit = EXCEL_HEADER_ALIAS_TO_CANONICAL[s];
      return hit || null;
    }

    function sheetHasCourseNameColumn(aoa) {
      const maxR = Math.min(60, aoa.length);
      for (let r = 0; r < maxR; r++) {
        const row = aoa[r] || [];
        for (let c = 0; c < row.length; c++) {
          const canon = mapExcelHeaderToCanonical(row[c]);
          if (canon === "课程名称") return true;
        }
      }
      return false;
    }

    function pickEnrollWorkbookSheetName(wb) {
      const names = wb.SheetNames || [];
      if (!names.length) return "";
      let bestName = null;
      let bestScore = -1;
      for (const n of names) {
        const sh = wb.Sheets[n];
        if (!sh) continue;
        const aoa = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "", raw: false });
        const hasHeaderCol = sheetHasCourseNameColumn(aoa);
        const hasFixed = aoaUsesFixedXlsxLayout(aoa);
        if (!hasHeaderCol && !hasFixed) continue;
        let score = Math.min(5000, aoa.length);
        const nm = String(n);
        if (/选课/.test(nm)) score += 2000;
        if (/(总览|封面|说明)/i.test(nm) && !/选课/.test(nm)) score -= 800;
        if (/(名单|学籍)/.test(nm)) score -= 400;
        if (score > bestScore) {
          bestScore = score;
          bestName = n;
        }
      }
      return bestName || names[0];
    }

    function findEnrollHeaderRowIndex(aoa) {
      let bestI = -1;
      let bestScore = -1;
      const maxR = Math.min(60, aoa.length);
      for (let r = 0; r < maxR; r++) {
        const row = aoa[r] || [];
        const mapped = [];
        for (let c = 0; c < row.length; c++) {
          const k = mapExcelHeaderToCanonical(row[c]);
          if (k) mapped.push(k);
        }
        if (!mapped.includes("课程名称")) continue;
        const uniq = new Set(mapped);
        let score = uniq.size;
        if (uniq.has("序号")) score += 3;
        if (uniq.has("教学班号")) score += 2;
        if (uniq.has("上课时间")) score += 2;
        if (uniq.has("学分")) score += 1;
        if (score > bestScore) {
          bestScore = score;
          bestI = r;
        }
      }
      if (bestI < 0) {
        throw new Error(
          "找不到课程表表头（需含「课程名称」列，可为「课程名」等别名；表头可在封面行之下）。多工作表时请把课表放在名称含「选课」的表，或确保该表含课程列。"
        );
      }
      return bestI;
    }

    const LS_KEY_ENROLL = "courseEnrollImportV1";
    const LS_KEY_ENROLL_ZH = "courseEnrollImportV1_zh";
    const LS_KEY_ENROLL_EN = "courseEnrollImportV1_en";
    const LS_KEY_EN_NAMES_ZH = "courseScheduleEnglishByIndexV1_zh";
    const LS_KEY_EN_NAMES_EN = "courseScheduleEnglishByIndexV1_en";
    const LS_KEY_AUTO_ONLINE_PENDING = "courseScheduleAutoOnlinePendingV1";
    const LS_KEY_ACTIVE_THIRD_BANDS = "courseScheduleActiveThirdBandsV1";
    const STORAGE_BACKUP_SUFFIX = "__bak";

    /* 按当前界面语言隔离中英文导入数据，避免彼此污染。 */
    function currentEnrollStorageKey() {
      return getEffectiveUiLang() === "en" ? LS_KEY_ENROLL_EN : LS_KEY_ENROLL_ZH;
    }

    function currentEnglishNameStorageKey() {
      return getEffectiveUiLang() === "en" ? LS_KEY_EN_NAMES_EN : LS_KEY_EN_NAMES_ZH;
    }

    function readStoredActiveThirdBands() {
      try {
        const raw = localStorage.getItem(LS_KEY_ACTIVE_THIRD_BANDS);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? new Set(arr.map((v) => String(v || "")).filter(Boolean)) : new Set();
      } catch (_e) {
        return new Set();
      }
    }

    function saveStoredActiveThirdBands(setLike) {
      try {
        localStorage.setItem(LS_KEY_ACTIVE_THIRD_BANDS, JSON.stringify(Array.from(setLike || [])));
      } catch (_e) {
        /* ignore */
      }
    }

    let activeThirdBandCellIds = readStoredActiveThirdBands();

    // cloneEnroll → window.__tsBridge
    function cloneEnroll(src) { return window.__tsBridge.cloneEnroll(src); }

    let enrollRestoredFromBackup = false;

    function loadEnrollFromStorage() {
      const cloneOk = (data) => {
        if (!data || !Array.isArray(data.headers) || !Array.isArray(data.courses)) return null;
        if (!data.headers.length || !data.courses.length) return null;
        return cloneEnroll(data);
      };
      const readKey = (storageKey) => {
        try {
          const raw = localStorage.getItem(storageKey);
          if (!raw) return null;
          const data = CourseTable.utils.safeJsonParse(raw, null);
          return cloneOk(data);
        } catch (_e) {
          return null;
        }
      };
      const primary = readKey(currentEnrollStorageKey());
      if (primary) return primary;
      const bak = readKey(currentEnrollStorageKey() + STORAGE_BACKUP_SUFFIX);
      if (bak) {
        enrollRestoredFromBackup = true;
        return bak;
      }
      return null;
    }

    let enrollSaveTimer = null;

    function writeEnrollSnapshotToStorage(src) {
      const key = currentEnrollStorageKey();
      const s = JSON.stringify({ headers: src.headers, courses: src.courses });
      localStorage.setItem(key, s);
      localStorage.setItem(key + STORAGE_BACKUP_SUFFIX, s);
    }

    function flushEnrollSaveNow() {
      if (enrollSaveTimer) {
        clearTimeout(enrollSaveTimer);
        enrollSaveTimer = null;
      }
      try {
        writeEnrollSnapshotToStorage(enrollData);
      } catch (_e) {
        /* ignore */
      }
    }

    function saveEnrollToStorage(data, flush) {
      void data;
      if (flush) {
        flushEnrollSaveNow();
        return;
      }
      if (enrollSaveTimer) clearTimeout(enrollSaveTimer);
      enrollSaveTimer = setTimeout(function () {
        enrollSaveTimer = null;
        try {
          writeEnrollSnapshotToStorage(enrollData);
        } catch (_e) {
          /* ignore */
        }
      }, 450);
    }

    let enrollData = loadEnrollFromStorage() || (getEffectiveUiLang() === "en" ? cloneEnroll(ENROLL_SAMPLE_EN) : cloneEnroll(ENROLL_DEFAULT));
    normalizeEnrollShape(enrollData, { restoredFromStorage: true });

    /** 与教务「选课表.xlsx」一致：仅 10 列数据行，无表头、无序号列 */
    function enrollToFixedLayoutAoa(data) {
      const keys = ENROLL_XLSX_FIXED_COLS;
      return data.courses.map((c) =>
        keys.map((key) => {
          const v = c[key];
          if (v == null) return "";
          return typeof v === "number" ? String(v) : String(v);
        })
      );
    }

    /** 带表头、含序号与网课列（备用导出，当前下载模板不使用） */
    function enrollToAoa(data) {
      const cols = ["序号", ...data.headers];
      const rows = data.courses.map((c) =>
        cols.map((key) => {
          if (key === "网课") return c[key] ? "是" : "否";
          const v = c[key];
          if (v == null) return "";
          return typeof v === "number" ? v : String(v);
        })
      );
      return [cols, ...rows];
    }

    // normalizeCell → window.__tsBridge
    function normalizeCell(v) { return window.__tsBridge.normalizeCell(v); }

    /** Excel / 复选框 / 文本 → 是否网课 */
    // parseOnlineField → window.__tsBridge
    function parseOnlineField(raw) { return window.__tsBridge.parseOnlineField(raw); }

    // normalizeEnrollShape → window.__tsBridge
    function normalizeEnrollShape(data, options) { return window.__tsBridge.normalizeEnrollShape(data, options); }

    // finalizeCourseIndices → window.__tsBridge
    function finalizeCourseIndices(courses) { return window.__tsBridge.finalizeCourseIndices(courses); }

    function firstNonEmptyRowIndex(aoa) {
      for (let r = 0; r < aoa.length; r++) {
        const row = aoa[r] || [];
        if (row.some((c) => normalizeCell(c) !== "")) return r;
      }
      return -1;
    }

    /**
     * 与教务「选课表.xlsx」一致：无表头行；A 列学年形如 2025-2026，B 列为学期 1 或 2，C 列为课程名称（非表头字面量「课程名称」）。
     */
    function rowLooksLikeFixedXlsxDataRow(row) {
      const r = row || [];
      const c0 = normalizeCell(r[0]);
      const c1 = normalizeCell(r[1]);
      const c2 = normalizeCell(r[2]);
      if (!c2 || c2 === "课程名称" || c2 === "课程名") return false;
      if (!/^\d{4}\s*-\s*\d{4}$/.test(c0)) return false;
      if (!/^[12]$/.test(c1)) return false;
      return true;
    }

    function aoaUsesFixedXlsxLayout(aoa) {
      const ri = firstNonEmptyRowIndex(aoa);
      if (ri < 0) return false;
      return rowLooksLikeFixedXlsxDataRow(aoa[ri]);
    }

    /**
     * 网课判定新规则（中英文）：
     * 中文 - 条件A：课程名含括号（）且课程类别含"选修"；条件B：上课时间和上课地点均为空。
     * 英文 - 条件A：课程名含()且Category含"Elective"；条件B：Class time和Classroom均为空。
     */
    // inferOnlineFlag → window.__tsBridge
    function inferOnlineFlag(courseName, courseCategory, classTime, classPlace) {
      return window.__tsBridge.inferOnlineFlag(courseName, courseCategory, classTime, classPlace);
    }

    function parseEnrollAoaFixedNoHeader(aoa) {
      const H = ENROLL_DEFAULT.headers.slice();
      const fixed = ENROLL_XLSX_FIXED_COLS;
      const courses = [];
      for (let r = 0; r < aoa.length; r++) {
        const row = aoa[r] || [];
        const normalized = fixed.map((_key, i) => normalizeCell(row[i]));
        const maybeName = normalized[2] || "";
        const maybeYear = normalized[0] || "";
        const maybeTerm = normalized[1] || "";
        const hasEnoughShape = normalized.some(Boolean) && maybeName && /^\d{4}\s*-\s*\d{4}$/.test(maybeYear) && /^[12]$/.test(maybeTerm);
        if (!rowLooksLikeFixedXlsxDataRow(row) && !hasEnoughShape) continue;
        const rowObj = {};
        for (const h of H) {
          rowObj[h] = "";
        }
        fixed.forEach((key, i) => {
          rowObj[key] = normalized[i];
        });
        rowObj.上课地点 = normalizeCell(rowObj.上课地点).replace(/\s+\)/g, ")");
        rowObj.网课 = inferOnlineFlag(rowObj.课程名称, rowObj.课程类别, rowObj.上课时间, rowObj.上课地点);
        rowObj.网课来源 = rowObj.网课 ? "auto" : "none";
        rowObj.序号 = null;
        courses.push(rowObj);
      }
      if (!courses.length) {
        throw new Error(
          "未识别到教务「选课表」数据行（须无表头：A 学年、B 学期 1/2、C 课程名称…共 10 列，与本页下载的选课表.xlsx 一致）。"
        );
      }
      return { headers: H, courses: finalizeCourseIndices(courses) };
    }

    function parseEnrollAoaWithHeaderRow(aoa) {
      const hri = findEnrollHeaderRowIndex(aoa);
      const headerRow = aoa[hri] || [];
      const colIndex = Object.create(null);
      headerRow.forEach((cell, i) => {
        const canon = mapExcelHeaderToCanonical(cell);
        if (!canon) return;
        if (colIndex[canon] === undefined) {
          colIndex[canon] = i;
        }
      });
      if (colIndex["课程名称"] === undefined) {
        throw new Error(
          "表头须能识别「课程名称」列（可为「课程名」等别名）。请使用教务无表头 10 列格式，或带表头的导出表。"
        );
      }
      const H = ENROLL_DEFAULT.headers.slice();
      const courses = [];
      for (let r = hri + 1; r < aoa.length; r++) {
        const row = aoa[r] || [];
        const get = (key) => {
          const j = colIndex[key];
          if (j === undefined) return "";
          return normalizeCell(row[j]);
        };
        const courseName = get("课程名称");
        const timeText = get("上课时间");
        const placeText = get("上课地点");
        const hasAnyUsefulCell = row.some((cell) => normalizeCell(cell) !== "");
        if (!courseName && !timeText && !placeText && !hasAnyUsefulCell) {
          continue;
        }
        if (!courseName) {
          continue;
        }
        const rowObj = {};
        for (const h of H) {
          rowObj[h] = get(h);
        }
        rowObj.上课地点 = normalizeCell(rowObj.上课地点).replace(/\s+\)/g, ")");
        const rawOnline = rowObj.网课;
        const hasExplicitOnlineField = rawOnline === true || rawOnline === false || ["1", "0", "是", "否", "y", "n", "yes", "no", "true", "false", "√", "✓", "网课", "online"].includes(String(rawOnline == null ? "" : rawOnline).trim().toLowerCase());
        const inferredOnline = inferOnlineFlag(rowObj.课程名称, rowObj.课程类别, rowObj.上课时间, rowObj.上课地点);
        if (hasExplicitOnlineField) {
          rowObj.网课 = parseOnlineField(rawOnline);
          rowObj.网课来源 = "manual";
        } else {
          rowObj.网课 = inferredOnline;
          rowObj.网课来源 = inferredOnline ? "auto" : "none";
        }
        const rawIdx = get("序号");
        const parsedIdx = parseInt(rawIdx, 10);
        rowObj.序号 = Number.isFinite(parsedIdx) && parsedIdx > 0 ? parsedIdx : null;
        courses.push(rowObj);
      }
      if (!courses.length) {
        throw new Error("没有有效课程行（每行至少填写「课程名称」）。");
      }
      return { headers: H, courses: finalizeCourseIndices(courses) };
    }

    function parseEnrollAoa(aoa) {
      if (!aoa || !aoa.length) {
        throw new Error("工作表为空。");
      }
      if (aoaUsesFixedXlsxLayout(aoa)) {
        return parseEnrollAoaFixedNoHeader(aoa);
      }
      return parseEnrollAoaWithHeaderRow(aoa);
    }

    function parseEnrollWorkbook(wb) {
      if (!wb.SheetNames || !wb.SheetNames.length) {
        throw new Error("工作簿无工作表。");
      }
      const name = pickEnrollWorkbookSheetName(wb);
      const sheet = wb.Sheets[name];
      if (!sheet) {
        throw new Error("无法读取工作表：" + name);
      }
      const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
      return parseEnrollAoa(aoa);
    }

    function readFileAsArrayBuffer(file) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(fr.error || new Error("读取文件失败"));
        fr.readAsArrayBuffer(file);
      });
    }

    function readFileAsTextUtf8(file) {
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ""));
        fr.onerror = () => reject(fr.error || new Error("读取文件失败"));
        fr.readAsText(file, "UTF-8");
      });
    }

    const ENROLL_SAMPLE_ZH = cloneEnroll(ENROLL_DEFAULT);
    const ENROLL_SAMPLE_EN = {
      headers: ENROLL_DEFAULT.headers.slice(),
      courses: [
        {
          序号: 1,
          学年: "2025-2026",
          学期: "1",
          课程名称: "College English (Intermediate)",
          开课学院: "General Education Teaching Department",
          课程类别: "General Required",
          学分: "4",
          教学班号: "(2025-2026-1)-T0000008-03",
          任课教师: "Li Hua",
          上课时间: "Tuesday Periods 1-2 {Weeks 2-18}; Thursday Periods 3-4 {Weeks 2-18}",
          上课地点: "Multimedia (B-201); Multimedia (B-201)",
          网课: false
        },
        {
          序号: 2,
          学年: "2025-2026",
          学期: "1",
          课程名称: "AI and the Information Society (Erya)",
          开课学院: "General Education Teaching Department",
          课程类别: "General Elective",
          学分: "2",
          教学班号: "(2025-2026-1)-13000521-01",
          任课教师: "Superstar Erya",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 3,
          学年: "2025-2026",
          学期: "1",
          课程名称: "College Mental Health Education II",
          开课学院: "Mental Health Education Center",
          课程类别: "General Required",
          学分: "1.5",
          教学班号: "(2025-2026-1)-J0000012-11",
          任课教师: "Wang Li",
          上课时间: "Monday Periods 5-6 {Weeks 2-19}",
          上课地点: "Multimedia (B-330)",
          网课: false
        },
        {
          序号: 4,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Social Practice",
          开课学院: "Student Affairs Division, People's Armed Forces Department",
          课程类别: "Practical Training",
          学分: "2.5",
          教学班号: "(2025-2026-1)-J0000005-15",
          任课教师: "Zhang Qiang",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 5,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Organic Chemistry Lab",
          开课学院: "College of Inspection, Testing and Certification",
          课程类别: "Major Required",
          学分: "1.5",
          教学班号: "(2025-2026-1)-R24H0003-02",
          任课教师: "Liu Yang, Chen Jing",
          上课时间: "Thursday Periods 9-10 {Weeks 3-18}",
          上课地点: "Multimedia (C-215)",
          网课: false
        },
        {
          序号: 6,
          学年: "2025-2026",
          学期: "1",
          课程名称: "College English (3-2)",
          开课学院: "General Education Teaching Department",
          课程类别: "General Required",
          学分: "3",
          教学班号: "(2025-2026-1)-T0000047-05",
          任课教师: "Zhao Gang",
          上课时间: "Wednesday Periods 3-4 {Weeks 2-19}; Friday Periods 1-2 {Weeks 2-19}",
          上课地点: "Lecture Hall 4; Lecture Hall 4",
          网课: false
        },
        {
          序号: 7,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Current Affairs and Policy (6-2)",
          开课学院: "School of Marxism",
          课程类别: "General Required",
          学分: "0.2",
          教学班号: "(2025-2026-1)-M0000035-08",
          任课教师: "Sun Hong",
          上课时间: "Saturday Periods 1-2 {Weeks 4, 9, 14}",
          上课地点: "Multimedia (A-401)",
          网课: false
        },
        {
          序号: 8,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Entrepreneurship Practice",
          开课学院: "College of Innovation and Entrepreneurship",
          课程类别: "General Required",
          学分: "2.5",
          教学班号: "(2025-2026-1)-N0000002-06",
          任课教师: "Zhou Tao",
          上课时间: "Tuesday Periods 7-8 {Weeks 1-18}",
          上课地点: "Multimedia (B-204)",
          网课: false
        },
        {
          序号: 9,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Career Communication and Etiquette",
          开课学院: "General Education Teaching Department",
          课程类别: "General Required",
          学分: "1",
          教学班号: "(2025-2026-1)-T0000010-04",
          任课教师: "Wu Fang",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 10,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Mechanical Drawing",
          开课学院: "School of Intelligent Manufacturing",
          课程类别: "Major Required",
          学分: "4",
          教学班号: "(2025-2026-1)-R05H0101-01",
          任课教师: "Ma Chao",
          上课时间: "Monday Periods 9-10 {Weeks 2-19}",
          上课地点: "Multimedia (A-512)",
          网课: false
        },
        {
          序号: 11,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Python Basics (Online)",
          开课学院: "General Education Teaching Department",
          课程类别: "General Elective (Online)",
          学分: "2",
          教学班号: "(2025-2026-1)-G0000020-02",
          任课教师: "Jin Lei",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 12,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Advanced Mathematics (2-1)",
          开课学院: "General Education Teaching Department",
          课程类别: "General Required",
          学分: "5",
          教学班号: "(2025-2026-1)-T0000006-05",
          任课教师: "Zheng Li",
          上课时间: "Thursday Periods 5-6 {Weeks 2-19}; Tuesday Periods 1-2 {Weeks 2-19}",
          上课地点: "Multimedia (B-416); Multimedia (B-416)",
          网课: false
        },
        {
          序号: 13,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Public Speaking and Social Etiquette (Erya)",
          开课学院: "General Education Teaching Department",
          课程类别: "General Elective",
          学分: "2",
          教学班号: "(2025-2026-1)-13000775-01",
          任课教师: "Superstar Erya",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 14,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Innovation Competition in Practice (Erya)",
          开课学院: "General Education Teaching Department",
          课程类别: "School Entrepreneurship and Innovation Education",
          学分: "3",
          教学班号: "(2025-2026-1)-13000724-01",
          任课教师: "Superstar Erya",
          上课时间: "Friday Periods 5-6 {Weeks 2-17}",
          上课地点: "",
          网课: true
        },
        {
          序号: 15,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Ideological and Moral Cultivation and Rule of Law",
          开课学院: "School of Marxism",
          课程类别: "General Required",
          学分: "3",
          教学班号: "(2025-2026-1)-M0000002-10",
          任课教师: "Yang Fan",
          上课时间: "Tuesday Periods 3-4 {Weeks 11-12}; Friday Periods 9-10 {Weeks 15-16}",
          上课地点: "Lecture Hall 6; Multimedia (A-307)",
          网课: false
        },
        {
          序号: 16,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Freshman Orientation and Military Training",
          开课学院: "Student Affairs Division, People's Armed Forces Department",
          课程类别: "Practical Training",
          学分: "2",
          教学班号: "(2025-2026-1)-J0000004-82",
          任课教师: "Chen Gang",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 17,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Basketball 1",
          开课学院: "School of Physical Education and Health Management",
          课程类别: "General Required",
          学分: "1",
          教学班号: "(2025-2026-1)-K0000109-03",
          任课教师: "Huang Jian",
          上课时间: "Thursday Periods 7-8 {Weeks 1-9, 11-20}",
          上课地点: "Gymnasium 201",
          网课: false
        },
        {
          序号: 18,
          学年: "2025-2026",
          学期: "1",
          课程名称: "College Mental Health Education I",
          开课学院: "Mental Health Education Center",
          课程类别: "General Required",
          学分: "1.5",
          教学班号: "(2025-2026-1)-J0000011-44",
          任课教师: "Xu Xueping",
          上课时间: "Monday Periods 1-2 {Weeks 2-19}",
          上课地点: "Multimedia (B-328)",
          网课: false
        },
        {
          序号: 19,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Ancient World Civilizations (Erya)",
          开课学院: "General Education Teaching Department",
          课程类别: "General Elective",
          学分: "2",
          教学班号: "(2025-2026-1)-13000662-01",
          任课教师: "Superstar Erya",
          上课时间: "",
          上课地点: "",
          网课: true
        },
        {
          序号: 20,
          学年: "2025-2026",
          学期: "1",
          课程名称: "Analytical Chemistry",
          开课学院: "College of Inspection, Testing and Certification",
          课程类别: "Major Required",
          学分: "1.5",
          教学班号: "(2025-2026-1)-R24H0004-06",
          任课教师: "Lin Qiang, Wang Qian",
          上课时间: "Wednesday Periods 9-10 {Weeks 2-19}",
          上课地点: "Multimedia (B-518)",
          网课: false
        }
      ]
    };

    function downloadEnrollSample(lang) {
      if (typeof XLSX === "undefined" || !XLSX.utils) {
        throw new Error("表格库未加载，请联网后刷新再试。");
      }
      const useLang = lang === "en" ? "en" : "zh";
      const sample = useLang === "en" ? ENROLL_SAMPLE_EN : ENROLL_SAMPLE_ZH;
      const headerRow = useLang === "en"
        ? ["Academic Year", "Term", "Course Name (EN)", "Affiliated College", "Category", "Credits", "Class Section ID", "Instructor", "Class Time", "Classroom / Venue"]
        : ["学年", "学期", "课程名称", "开课学院", "课程类别", "学分", "教学班号", "任课教师", "上课时间", "上课地点"];
      const ws = XLSX.utils.aoa_to_sheet([headerRow].concat(enrollToFixedLayoutAoa(sample)));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, useLang === "en" ? "Sample" : "选课表");
      XLSX.writeFile(wb, useLang === "en" ? "enrollment_sample_en.xlsx" : "选课表_示例_zh.xlsx");
    }

    function showEnrollImportToast(msg) {
      const el = document.getElementById("enroll-import-toast");
      if (!el) return;
      el.textContent = msg;
      el.hidden = false;
      window.clearTimeout(showEnrollImportToast._t);
      showEnrollImportToast._t = window.setTimeout(() => {
        el.hidden = true;
      }, 4500);
    }

    function setMetaSourceFromEnroll() {
      const el = document.getElementById("meta-source");
      if (!el) return;
      const L = I18N[getRenderLang()] || I18N.zh;
      try {
        if (lastEnrollImportMeta.fileName) {
          const importedAt = lastEnrollImportMeta.importedAt ? `（导入于 ${lastEnrollImportMeta.importedAt}）` : "";
          el.textContent = `${lastEnrollImportMeta.fileName}${importedAt}`;
          return;
        }
        el.textContent = localStorage.getItem(currentEnrollStorageKey()) ? L.metaSourceSaved : L.metaSourceEmbedded;
      } catch (_e) {
        el.textContent = L.metaSourceEmbedded;
      }
    }

    /** 周一至周日（与单页 A3 版式一致） */
    const DAYS = [
      { key: "mon", label: "周一" },
      { key: "tue", label: "周二" },
      { key: "wed", label: "周三" },
      { key: "thu", label: "周四" },
      { key: "fri", label: "周五" },
      { key: "sat", label: "周六" },
      { key: "sun", label: "周日" }
    ];
    /** 课次行（时间文案由侧栏编辑 + localStorage，见 SLOT_TIME_DEFAULT） */
    const SLOTS = [
      { key: "p12", label: "第1–2节" },
      { key: "p34", label: "第3–4节" },
      { key: "p56", label: "第5–6节" },
      { key: "p78", label: "第7–8节" },
      { key: "p910", label: "第9–10节" },
      { key: "p1112", label: "第11–12节" }
    ];

    const SLOT_TIME_DEFAULT = "(xx:xx~xx:xx)";
    const LS_KEY_SLOT_TIMES = "courseScheduleSlotTimesV1";

    /**
     * 时段竖栏：第1–2、3–4节→上午；第5–6、7–8节→下午；第9–10、11–12节→晚上。
     * 同档两行共用一格（rowspan=2）。
     */
    function dayPartLeadingCell(slotIndex) {
      const head = trSheet("gridDayPartHead");
      if (slotIndex === 0) {
        const lab = dayPartLabelForSheet(0);
        return `<td class="day-part-cell" rowspan="2" aria-label="${escapeHtml(head)}：${escapeHtml(lab)}"><span class="day-part-v">${escapeHtml(lab)}</span></td>`;
      }
      if (slotIndex === 1) {
        return "";
      }
      if (slotIndex === 2) {
        const lab = dayPartLabelForSheet(1);
        return `<td class="day-part-cell" rowspan="2" aria-label="${escapeHtml(head)}：${escapeHtml(lab)}"><span class="day-part-v">${escapeHtml(lab)}</span></td>`;
      }
      if (slotIndex === 3) {
        return "";
      }
      if (slotIndex === 4) {
        const lab = dayPartLabelForSheet(2);
        return `<td class="day-part-cell" rowspan="2" aria-label="${escapeHtml(head)}：${escapeHtml(lab)}"><span class="day-part-v">${escapeHtml(lab)}</span></td>`;
      }
      if (slotIndex === 5) {
        return "";
      }
      return "";
    }

    const LS_KEY = "courseScheduleGridV3_monoA3_mf";
    const LS_KEY_GRID_BAK = LS_KEY + "__bak";
    const LS_KEY_UI_LANG = "courseScheduleUiLangPrefV1";
    const LS_KEY_EN_NAMES = "courseScheduleEnglishByIndexV1";
    const LS_KEY_SHOW_EN_SUB = "courseScheduleShowEnSubCellV1";

    /** 仅影响 A3 版芯内表头/标签的渲染语言；null 表示与界面语言一致 */
    let sheetRenderLang = null;
    /** 导出 PDF 截图时临时隐藏「网课」列，使版面更整洁 */
    let pdfExportHideOnline = false;

    const I18N = {
      zh: {
        sidebarTitle: "编辑与导出",
        sidebarIntro:
          "布局参考 <strong>Normalization-I</strong>：左侧为<strong>说明与操作</strong>；右侧为<strong>A3 版芯预览</strong>——在屏幕上会随栏宽<strong>等比例缩小</strong>以便对照侧栏阅读；打印 / PDF 仍为<strong>物理 A3、不缩放</strong>。",
        labelLangBox: "界面语言",
        lblLangAuto: "跟随浏览器",
        lblLangZh: "中文",
        lblLangEn: "English",
        lblShowEnSub: "周课表：在中文课程名下方显示英文小字",
        btnPrint: "打印 / PDF",
        btnExportPdf: "导出 PDF (A3 双语)",
        btnDemo: "填入演示序号",
        btnAutofill: "按上课时间自动填格",
        btnSaveManual: "手动保存",
        btnClear: "清空周课表",
        btnUndo: "撤销上一步",
        btnRedo: "重做上一步",
        btnSampleZhExcel: "下载中文选课表示例",
        btnSampleEnExcel: "下载英文选课表示例",
        labelStartTime: "每日课程开始时间",
        labelLessonDuration: "每节课时间（分钟）",
        labelMidRest: "每节课中休息（分钟）",
        labelBreakRest: "下课休息（分钟）",
        labelNoonBreak: "午休时间（分钟）",
        labelEveningBreak: "傍晚休时间（分钟）",
        btnComputeSlots: "计算并应用",
        labelSlotConfig: "课次时间计算器",
        saveToast: "已暂存到本机（localStorage）。",
        activityLog: "操作记录",
        activityLogEmpty: "暂时还没有操作记录。",
        statusLastAutosave: "上次自动保存：",
        statusLastAction: "最后操作：",
        statusLastError: "最后错误：",
        statusNeverSaved: "未保存",
        statusDash: "—",
        translationWarning: "检测到浏览器翻译正在运行，请先关闭页面翻译后再操作（通常在地址栏右侧的翻译图标中设置），否则可能导致排版错乱。",
        serviceConsentBannerText: "本工具仅供排版辅助，所填内容真实性由使用者负责。非学校官方文件。",
        serviceConsentBannerBtn: "已知悉",
        previewHintLead:
          "以下为 <strong>A3（297×420 mm）</strong>版芯的屏幕预览；在<strong>预览区宽度</strong>内<strong>等比例缩放</strong>以便与左侧说明对照。打印 / PDF 为 <strong>1:1</strong> 物理 A3。",
        previewScale100: " 当前 100%。",
        previewScalePct: (n) => ` 当前约 ${n}%。`,
        docTitle: "选课&课表对照单X-Formal · 学期选课与周课表（单页 A3）",
        docLead: "上：选课表（完整）　·　下：周课表（名称 / 时间 / 地点 / 代号；周一至周日）",
        metaSource: "来源：",
        metaTerm: "学年学期：",
        metaSourceEmbedded: "内嵌范本 · 可导入 Excel 替换",
        metaSourceSaved: "Excel / 本机已保存的选课表",
        hEnroll: "选课表（完整呈现）",
        totalsCourses: "课程门数：",
        totalsCredits: "学分合计：",
        hSched: "周课表（序号 → 名称 / 时间 / 地点 / 代号 · 周一至周日）",
        footerNote: "对照辅助工具生成，非学校正式文件。使用者对填写的所有内容负责。",
        rimNote: "ISO A3 竖向 297×420 mm · 一页内上下编排 · 周课表含周六周日",
        gridCorner: "节次 \\ 星期",
        gridDayPartHead: "时段",
        days: { mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日" },
        slots: {
          p12: "第1–2节",
          p34: "第3–4节",
          p56: "第5–6节",
          p78: "第7–8节",
          p910: "第9–10节",
          p1112: "第11–12节"
        },
        dayParts: ["上午", "下午", "晚上"],
        headers: {
          学年: "学年",
          学期: "学期",
          课程名称: "课程名称",
          开课学院: "开课学院",
          课程类别: "课程类别",
          学分: "学分",
          教学班号: "教学班号",
          任课教师: "任课教师",
          上课时间: "上课时间",
          上课地点: "上课地点",
          网课: "网课",
          序号: "序号"
        },
        exportModalTitle: "导出前自查清单",
        exportCancel: "取消",
        exportContinue: "继续导出",
        exportLegal: "导出即确认：本文件为排版对照件，非学校正式文件。本人对所有填写内容承担全部责任。",
        chkTeacher: "教师时间冲突",
        chkRoom: "教室时间占用冲突",
        chkAsync: "多地点与多时段（理论/实验拆分）",
        chkUnassigned: "未排入周课表",
        chkOnlineGrid: "网课误排",
        chkInvalid: "无效序号",
        chkTriple: "三课及以上同格",
        chkFuzzy: "课程类别模糊",
        noIssues: "未检测到额外问题。",
        termDash: "—",
        exportPhraseExpected: "",
        exportPhraseHint:
          "为继续导出或打印，请在下方输入框中完整键入系统随机抽取的确认短语，须一字不差（含标点）。",
        exportPhrasePlaceholder: "请完整输入上方显示的短语",
        exportPhraseMismatch: "短语不匹配，请逐字检查标点与内容",
        termSemester1: "第一学期",
        termSemester2: "第二学期",
        termSemesterN: (n) => `第${n}学期`,
        cacheClearHint: "在公共电脑使用后，可一键清除本工具写入浏览器的全部数据并刷新页面。",
        cacheClearBtn: "清除本机全部缓存数据",
        cacheClearConfirm: "将清除选课表、课表、语言偏好、英文课名等全部本机数据并刷新页面。确定继续？",
        cacheClearOfferBackup: "清除前，建议先下载一份完整项目 JSON 备份。是否现在下载备份？",
        importBackupBtn: "导入备份文件（JSON）",
        importBackupSuccess: "数据已恢复",
        importBackupFail: "未恢复 / 备份文件损坏",
        enrollNameEditableHint: "可直接编辑课程名称，修改后自动保存到本机。",
        packageCoverTitle: "课程与选课对照材料",
        packageNoLabel: "材料编号",
        packageTermLabel: "学年学期",
        packageDateLabel: "生成日期",
        packageSourceLabel: "数据来源",
        packageVersionLabel: "工具版本",
        packagePurposeLabel: "用途说明",
        packagePurposeValue: "课程编排与选课记录辅助提交材料",
        packageDescription: "本材料包由课程排版工具生成，仅用于排版辅助，数据真实性由申请人负责。原始数据来源于教务系统导出文件。",
        packageStatementTitle: "数据一致性声明",
        packageStatementBody: "本人声明：本申请包中所附选课表及周课表信息，均提取自教务系统官方选课记录，仅进行排版整理，未对课程名称、时间、地点等关键信息作任何修改。若有不实，愿承担相应责任。",
        packageSignStudent: "学生签名",
        packageSignDate: "日期",
        packageSignOffice: "教务处审核",
        packageSignSeal: "盖章",
        labelLayout: "版式说明",
        layoutNote1: "单张 A3 竖向 297×420 mm，上半为选课表，下半为周课表。",
        layoutNote2: "打印请选择 <strong>A3</strong>、缩放 100%，建议关闭浏览器「页眉页脚」。",
        btnEnrollImport: "导入 Excel…",
        btnEnrollReset: "恢复内嵌范本",
        sidebarToggleTitle: "打开 / 关闭侧栏",
        btnExportPackage: "导出申请包",
        enrollImportConfirm: "导入的数据将覆盖当前选课表。请确认数据来源真实准确，本人对填写的所有内容负责。继续导入？",
        enrollImportNoLib: "未加载表格解析库，请检查网络后刷新页面。",
        enrollImportReading: "正在读取 Excel 文件…",
        enrollImportBuilding: "正在生成导入预览…",
        enrollImportSampleZhStart: "已开始下载中文示例 Excel。",
        enrollImportSampleEnStart: "已开始下载英文示例 Excel（无表头 10 列）。",
        autoSaveMsg: "已自动保存到本机。",
        enrollResetMsg: "已恢复内嵌范本。"
      },
      en: {
        sidebarTitle: "Edit & export",
        sidebarIntro:
          "Layout follows <strong>Normalization-I</strong>: <strong>notes and actions</strong> on the left; <strong>A3 canvas preview</strong> on the right (scaled on screen). <strong>Print / PDF</strong> stays true <strong>A3</strong> at 1:1.",
        labelLangBox: "UI language",
        lblLangAuto: "Match browser",
        lblLangZh: "中文",
        lblLangEn: "English",
        lblShowEnSub: "Weekly grid: show English course name under Chinese (fill English names first)",
        btnPrint: "Print / PDF",
        btnExportPdf: "Export PDF (A3 bilingual)",
        btnDemo: "Load demo indices",
        btnAutofill: "Autofill from class times",
        btnSaveManual: "Save",
        btnClear: "Clear Weekly Grid",
        btnUndo: "Undo last step",
        btnRedo: "Redo last step",
        btnSampleZhExcel: "Download Chinese sample enrollment table",
        btnSampleEnExcel: "Download English sample enrollment table",
        labelStartTime: "Daily class start time",
        labelLessonDuration: "Lesson duration (min)",
        labelMidRest: "Mid-class break (min)",
        labelBreakRest: "Between-slot break (min)",
        labelNoonBreak: "Lunch break (min)",
        labelEveningBreak: "Evening break (min)",
        btnComputeSlots: "Compute & Apply",
        labelSlotConfig: "Period time calculator",
        saveToast: "Saved locally (localStorage).",
        activityLog: "Activity log",
        activityLogEmpty: "No activity yet.",
        statusLastAutosave: "Last auto-save:",
        statusLastAction: "Last action:",
        statusLastError: "Last error:",
        statusNeverSaved: "Not saved",
        statusDash: "—",
        translationWarning: "Browser translation is active. Please turn off page translation first (usually via the translation icon on the right side of the address bar), otherwise the A3 layout may break.",
        serviceConsentBannerText: "This tool assists with layout only. You are responsible for the accuracy of entered data. It is not an official school document.",
        serviceConsentBannerBtn: "Got it",
        previewHintLead:
          "Below is the <strong>A3 (297×420 mm)</strong> canvas preview, scaled to fit the column. Print / PDF uses true <strong>1:1</strong> A3.",
        previewScale100: " Currently 100%.",
        previewScalePct: (n) => ` About ${n}%.`,
        docTitle: "Enrollment & timetable comparison X Formal · single A3",
        docLead: "Top: enrollment table · Bottom: weekly grid (name / time / place / code; Mon–Sun)",
        metaSource: "Source:",
        metaTerm: "Academic term:",
        metaSourceEmbedded: "Embedded sample · replace via Excel",
        metaSourceSaved: "Excel / saved enrollment data",
        hEnroll: "Enrollment table (full)",
        totalsCourses: "Courses:",
        totalsCredits: "Credits total:",
        hSched: "Weekly grid (index → name / time / place / code · Mon–Sun)",
        footerNote: "Unofficial helper layout. Not an institutional document. You are responsible for all entries.",
        rimNote: "ISO A3 portrait 297×420 mm · Mon–Sun included",
        gridCorner: "Period \\ weekday",
        gridDayPartHead: "Part of day",
        days: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
        slots: {
          p12: "Periods 1–2",
          p34: "Periods 3–4",
          p56: "Periods 5–6",
          p78: "Periods 7–8",
          p910: "Periods 9–10",
          p1112: "Periods 11–12"
        },
        dayParts: ["AM", "PM", "EVN"],
        headers: {
          学年: "Academic year",
          学期: "Term",
          课程名称: "Course name (EN)",
          开课学院: "School / College",
          课程类别: "Category",
          学分: "Credits",
          教学班号: "Class section ID",
          任课教师: "Instructor",
          上课时间: "Class time",
          上课地点: "Classroom / venue",
          网课: "Online",
          序号: "No."
        },
        exportModalTitle: "Pre-export checklist",
        exportCancel: "Cancel",
        exportContinue: "Continue",
        exportLegal:
          "By exporting you confirm this is an unofficial layout, not an institutional document. You accept full responsibility for all content.",
        chkTeacher: "Instructor time overlap",
        chkRoom: "Room double-booking",
        chkAsync: "Multiple venues vs. segments (lab/lecture split)",
        chkUnassigned: "Not placed on weekly grid",
        chkOnlineGrid: "Online course placed on grid",
        chkInvalid: "Invalid index in grid",
        chkTriple: "Three or more courses same cell",
        chkFuzzy: "Ambiguous course category",
        noIssues: "No extra issues detected.",
        termDash: "—",
        exportPhraseExpected: "",
        exportPhraseHint:
          "To continue with export or print, type the randomly selected confirmation phrase shown below exactly as displayed, including punctuation.",
        exportPhrasePlaceholder: "Type the displayed phrase exactly",
        exportPhraseMismatch: "The phrase does not match. Please check every character and punctuation.",
        termSemester1: "Term 1",
        termSemester2: "Term 2",
        termSemesterN: (n) => `Term ${n}`,
        cacheClearHint: "On a shared computer, clear all data this tool saved in the browser, then reload.",
        cacheClearBtn: "Clear all local cache",
        cacheClearConfirm:
          "This removes enrollment, timetable, language preference, English names, and all other local data for this tool, then reloads the page. Continue?",
        cacheClearOfferBackup:
          "Download a full project JSON backup before clearing? (Recommended.)",
        importBackupBtn: "Import backup file (JSON)",
        importBackupSuccess: "Data restored",
        importBackupFail: "Not restored / backup file corrupted",
        enrollNameEditableHint: "Edit course name in place; changes save automatically.",
        packageCoverTitle: "Course & Timetable Comparison Package",
        packageNoLabel: "Package No.",
        packageTermLabel: "Academic Term",
        packageDateLabel: "Generated On",
        packageSourceLabel: "Data Source",
        packageVersionLabel: "Tool Version",
        packagePurposeLabel: "Purpose",
        packagePurposeValue: "Supporting package for course arrangement and enrollment record submission",
        packageDescription: "This package is generated by the course layout tool for formatting assistance only. The applicant is responsible for data authenticity. The source data comes from official enrollment exports.",
        packageStatementTitle: "Data Consistency Statement",
        packageStatementBody: "I hereby declare that the enrollment table and weekly timetable included in this package are extracted from official enrollment records and only reformatted for layout purposes. No key information such as course names, class times, or venues has been altered. I accept responsibility for any inaccuracy.",
        packageSignStudent: "Student Signature",
        packageSignDate: "Date",
        packageSignOffice: "Academic Office Review",
        packageSignSeal: "Seal",
        labelLayout: "Layout notes",
        layoutNote1: "Single A3 portrait 297×420 mm — enrollment table on top, weekly grid below.",
        layoutNote2: "Print: select <strong>A3</strong>, scale 100%, disable browser headers/footers.",
        btnEnrollImport: "Import Excel…",
        btnEnrollReset: "Restore embedded sample",
        sidebarToggleTitle: "Open / close sidebar",
        btnExportPackage: "Export application package",
        enrollImportConfirm: "Importing will replace the current enrollment table. Confirm that the data is accurate and that you are responsible for all entries. Continue?",
        enrollImportNoLib: "Spreadsheet library not loaded. Check your connection and refresh.",
        enrollImportReading: "Reading Excel file…",
        enrollImportBuilding: "Building import preview…",
        enrollImportSampleZhStart: "Downloading Chinese sample Excel.",
        enrollImportSampleEnStart: "Downloading English sample Excel (10 columns, no header).",
        autoSaveMsg: "Local auto-save completed.",
        enrollResetMsg: "Embedded sample restored."
      }
    };

    /** 本工具 localStorage 键：含选课/课表/语言/合规日志等，供一键清除 */
    const LS_KEY_COMPLIANCE_LOG = "courseScheduleComplianceLogV2";
    const COMPLIANCE_LOG_MAX = 200;

    const LS_KEYS_ALL_TOOL = [
      LS_KEY,
      LS_KEY_ENROLL,
      LS_KEY_ENROLL_ZH,
      LS_KEY_ENROLL_EN,
      LS_KEY_UI_LANG,
      LS_KEY_EN_NAMES,
      LS_KEY_EN_NAMES_ZH,
      LS_KEY_EN_NAMES_EN,
      LS_KEY_SHOW_EN_SUB,
      LS_KEY_SLOT_TIMES,
      LS_KEY_COMPLIANCE_LOG,
      LS_KEY_ACTIVE_THIRD_BANDS,
      LS_KEY_AUTO_ONLINE_PENDING
    ];

    /**
     * UTF-8 文本 → SHA-256 十六进制。
     * 优先使用原生 Web Crypto；若浏览器环境不支持，再退回到纯 JavaScript 实现，
     * 以确保姓名哈希 / 导出短语哈希在任意环境下都能完成。
     */
    function sha256FallbackSync(text) {
      function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
      }
      const mathPow = Math.pow;
      const maxWord = mathPow(2, 32);
      let result = "";
      const words = [];
      const ascii = unescape(encodeURIComponent(String(text == null ? "" : text)));
      const asciiBitLength = ascii.length * 8;
      const hash = [];
      const k = [];
      let primeCounter = 0;
      const isComposite = {};
      for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (let i = 0; i < 313; i += candidate) {
            isComposite[i] = candidate;
          }
          hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
          k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
      }
      for (let i = 0; i < ascii.length; i++) {
        words[i >> 2] |= ascii.charCodeAt(i) << ((3 - i) % 4) * 8;
      }
      words[ascii.length >> 2] |= 0x80 << ((3 - ascii.length) % 4) * 8;
      words[((ascii.length + 8 >> 6) + 1) * 16 - 1] = asciiBitLength;
      for (let j = 0; j < words.length;) {
        const w = words.slice(j, (j += 16));
        const oldHash = hash.slice(0);
        for (let i = 0; i < 64; i++) {
          const w15 = w[i - 15];
          const w2 = w[i - 2];
          const a = hash[0];
          const e = hash[4];
          const temp1 =
            hash[7] +
            (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
            ((e & hash[5]) ^ (~e & hash[6])) +
            k[i] +
            (w[i] = i < 16
              ? w[i]
              : (w[i - 16] +
                  (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                  w[i - 7] +
                  (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
                0);
          const temp2 =
            (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
            ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash.unshift((temp1 + temp2) | 0);
          hash[4] = (hash[4] + temp1) | 0;
          hash.pop();
        }
        for (let i = 0; i < 8; i++) {
          hash[i] = (hash[i] + oldHash[i]) | 0;
        }
      }
      for (let i = 0; i < 8; i++) {
        for (let j = 3; j + 1; j--) {
          const b = (hash[i] >> (j * 8)) & 255;
          result += ((b < 16) ? 0 : "") + b.toString(16);
        }
      }
      return result;
    }

    async function sha256HexUtf8(text) {
      const s = String(text == null ? "" : text);
      try {
        if (window.crypto && crypto.subtle) {
          const enc = new TextEncoder();
          const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
          return Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        }
      } catch (_e) {
        /* fallback below */
      }
      return sha256FallbackSync(s);
    }

    const SESSION_KEY_SERVICE_CONSENT_NAME_HASH = "schedule_tool_service_consent_name_hash";
    const SESSION_KEY_PAGE_SESSION_ACTIVE = "schedule_tool_page_session_active";
    const SESSION_KEY_REFRESH_MARK = "schedule_tool_refresh_mark";

    const EXPORT_PHRASE_POOL_ZH = [
      "我，知晓我的行为，并为此承担相应法律风险。",
      "我确认已核对选课数据，并对导出内容承担全部责任。"
    ];
    const EXPORT_PHRASE_POOL_EN = [
      "I am aware of my actions and accept the corresponding legal risks.",
      "I confirm that I have verified the course data and accept full responsibility for the exported content."
    ];

    let userManuallySaved = false;

    function loadComplianceLog() {
      try {
        const raw = localStorage.getItem(LS_KEY_COMPLIANCE_LOG);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (_e) {
        return [];
      }
    }

    function saveComplianceLog(arr) {
      try {
        localStorage.setItem(LS_KEY_COMPLIANCE_LOG, JSON.stringify(Array.isArray(arr) ? arr : []));
      } catch (_e) {
        /* ignore */
      }
    }

    function complianceEventLabel(type) {
      const lang = getEffectiveUiLang();
      const labels = {
        import_excel_result: lang === "en" ? "Excel import" : "导入 Excel",
        demo_indices_loaded: lang === "en" ? "Demo indices loaded" : "填入演示序号",
        autofill_schedule: lang === "en" ? "Autofill timetable" : "按上课时间自动填格",
        clear_grid: lang === "en" ? "Clear timetable" : "清空课表格",
        clear_weekly_grid: lang === "en" ? "Clear weekly grid" : "清空周课表",
        undo_grid: lang === "en" ? "Undo" : "撤销操作",
        export_phrase_confirmed: lang === "en" ? "Export phrase confirmed" : "导出确认短语校验通过",
        export_executed: lang === "en" ? "Export executed" : "已执行导出/打印",
        enroll_cell_edit: lang === "en" ? "Enrollment cell edited" : "选课表单元格已保存",
        manual_save: lang === "en" ? "Manual save" : "手动保存"
      };
      return labels[type] || type;
    }

    function renderComplianceLogPanel() {
      const list = document.getElementById("compliance-log-list");
      if (!list) return;
      const arr = loadComplianceLog();
      const recent = arr.slice(-20).reverse();
      if (!recent.length) {
        const L = I18N[getEffectiveUiLang()] || I18N.zh;
        list.innerHTML = `<p class="compliance-log-empty">${escapeHtml(L.activityLogEmpty || "")}</p>`;
        return;
      }
      list.innerHTML = recent
        .map((entry) => {
          const label = complianceEventLabel(entry && entry.type ? entry.type : "unknown");
          const ts = entry && entry.ts ? new Date(entry.ts).toLocaleString() : "";
          return `<div class="compliance-log-item"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(ts)}</span></div>`;
        })
        .join("");
    }

    function getComplianceLogHashSubjectText(hash) {
      return `Compliance log hash: ${hash || ""}`;
    }

    /** 追加一条合规事件（仅存 phrase 哈希，不存明文短语） */
    function appendComplianceEvent(typeOrEntry, payload) {
      try {
        let arr = loadComplianceLog();
        const entry = typeof typeOrEntry === "string"
          ? { type: typeOrEntry, payload: payload != null && typeof payload === "object" ? payload : {} }
          : {
              type: typeOrEntry && typeOrEntry.type ? typeOrEntry.type : "unknown",
              payload: typeOrEntry && typeOrEntry.payload != null && typeof typeOrEntry.payload === "object" ? typeOrEntry.payload : {}
            };
        let sessionHash = "not-authenticated";
        try {
          sessionHash = sessionStorage.getItem(SESSION_KEY_SERVICE_CONSENT_NAME_HASH) || "not-authenticated";
        } catch (_e) {
          sessionHash = "not-authenticated";
        }
        arr.push({
          ts: Date.now(),
          type: entry.type,
          payload: entry.payload,
          sessionHash
        });
        while (arr.length > COMPLIANCE_LOG_MAX) arr.shift();
        saveComplianceLog(arr);
        renderComplianceLogPanel();
      } catch (_e) {
        /* ignore */
      }
    }

    /** 清除缓存前可下载的完整项目快照（不含合规日志本体） */
    function buildProjectBackupObject() {
      return {
        backupVersion: 1,
        exportedAt: new Date().toISOString(),
        tool: "enrollment-timetable-comparison-x-formal",
        enroll: enrollData,
        grid: gridState(),
        slotTimes: loadSlotTimesMap(),
        uiLangPref: getLangPref(),
        lastImportFileName: lastEnrollImportMeta.fileName || "",
        lastImportTime: lastEnrollImportMeta.importedAt || ""
      };
    }

    function downloadProjectJsonBackup() {
      const obj = buildProjectBackupObject();
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `course_schedule_backup_${formatYyyymmddLocal(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    /** 学期数字 → 正式书面语（随界面 / 版芯语言） */
    function formatSemesterLabel(rawSem, lang) {
      const L = I18N[lang === "en" ? "en" : "zh"] || I18N.zh;
      const n = parseInt(String(rawSem == null ? "" : rawSem).trim(), 10);
      if (!Number.isFinite(n) || n < 1) {
        const s = String(rawSem == null ? "" : rawSem).trim();
        return s || L.termDash;
      }
      if (n === 1) return L.termSemester1;
      if (n === 2) return L.termSemester2;
      if (typeof L.termSemesterN === "function") return L.termSemesterN(n);
      return lang === "en" ? `Term ${n}` : `第${n}学期`;
    }

    /** 导出文件名用本地日期 YYYYMMDD */
    function formatYyyymmddLocal(d) {
      const x = d instanceof Date ? d : new Date();
      const y = x.getFullYear();
      const m = String(x.getMonth() + 1).padStart(2, "0");
      const day = String(x.getDate()).padStart(2, "0");
      return `${y}${m}${day}`;
    }

    let statusLastAutosaveAt = 0;
    let statusLastActionMessage = "";
    let statusLastErrorMessage = "";
    let lastEnrollImportMeta = { fileName: "", importedAt: "" };

    function renderPersistentStatusBar() {
      const L = I18N[getEffectiveUiLang()] || I18N.zh;
      const la = document.getElementById("status-label-autosave");
      const va = document.getElementById("status-value-autosave");
      const ll = document.getElementById("status-label-action");
      const vl = document.getElementById("status-value-action");
      const le = document.getElementById("status-label-error");
      const ve = document.getElementById("status-value-error");
      if (la) la.textContent = L.statusLastAutosave;
      if (ll) ll.textContent = L.statusLastAction;
      if (le) le.textContent = L.statusLastError;
      if (va) va.textContent = statusLastAutosaveAt ? new Date(statusLastAutosaveAt).toLocaleString() : L.statusNeverSaved;
      if (vl) vl.textContent = statusLastActionMessage || L.statusDash;
      if (ve) {
        if (!isPageTranslated() && statusLastErrorMessage && statusLastErrorMessage.includes("翻译")) {
          statusLastErrorMessage = getEffectiveUiLang() === "en" ? "Ready." : "已就绪";
          ve.style.color = "#15803d";
          ve.style.whiteSpace = "";
          ve.classList.remove("translation-warn-blink");
        }
        ve.textContent = statusLastErrorMessage || L.statusDash;
      }
    }

    function updateStatusLastAction(message) {
      statusLastActionMessage = String(message == null ? "" : message).trim();
      renderPersistentStatusBar();
    }

    function updateStatusLastError(message) {
      statusLastErrorMessage = String(message == null ? "" : message).trim();
      renderPersistentStatusBar();
    }

    function markStatusAutosaveNow() {
      statusLastAutosaveAt = Date.now();
      renderPersistentStatusBar();
    }

    /** 与「课表格暂存」同一条 toast，用于 PDF / 自动填格等成功后的静默确认 */
    function flashSaveToast(durationMs) {
      const t = document.getElementById("save-toast");
      const L = I18N[getEffectiveUiLang()] || I18N.zh;
      markStatusAutosaveNow();
      if (!t) return;
      t.textContent = L.saveToast;
      t.hidden = false;
      if (flashSaveToast._tm) window.clearTimeout(flashSaveToast._tm);
      flashSaveToast._tm = window.setTimeout(() => {
        t.hidden = true;
        flashSaveToast._tm = null;
      }, durationMs || 1200);
    }

    function getLangPref() {
      try {
        return localStorage.getItem(LS_KEY_UI_LANG) || "";
      } catch (_e) {
        return "";
      }
    }

    function setLangPref(v) {
      try {
        if (!v) localStorage.removeItem(LS_KEY_UI_LANG);
        else localStorage.setItem(LS_KEY_UI_LANG, v);
      } catch (_e) {
        /* ignore */
      }
    }

    function getEffectiveUiLang() {
      const p = getLangPref();
      if (p === "zh" || p === "en") return p;
      const nav = (navigator.language || "").toLowerCase();
      return nav.startsWith("en") ? "en" : "zh";
    }

    function getRenderLang() {
      return sheetRenderLang || getEffectiveUiLang();
    }

    function tr(key) {
      const L = I18N[getEffectiveUiLang()] || I18N.zh;
      const v = L[key];
      return typeof v === "function" ? v : v != null ? v : key;
    }

    function trSheet(key) {
      const L = I18N[getRenderLang()] || I18N.zh;
      const v = L[key];
      return typeof v === "function" ? v : v != null ? v : key;
    }

    function headerLabelForSheet(h) {
      const pack = I18N[getRenderLang()] || I18N.zh;
      const m = pack.headers && pack.headers[h];
      return m != null ? m : h;
    }

    function dayLabelForSheet(dayKey) {
      const pack = I18N[getRenderLang()] || I18N.zh;
      return (pack.days && pack.days[dayKey]) || dayKey;
    }

    function slotLabelForSheet(slotKey) {
      const pack = I18N[getRenderLang()] || I18N.zh;
      return (pack.slots && pack.slots[slotKey]) || slotKey;
    }

    function dayPartLabelForSheet(i) {
      const pack = I18N[getRenderLang()] || I18N.zh;
      const arr = pack.dayParts || I18N.zh.dayParts;
      return arr[i] || "";
    }

    let englishNamesRestoredFromBackup = false;

    function loadEnglishByIndex() {
      const readKey = (k) => {
        const raw = localStorage.getItem(k);
        const o = CourseTable.utils.safeJsonParse(raw, null);
        return o && typeof o === "object" && !Array.isArray(o) ? o : null;
      };
      const primaryKey = currentEnglishNameStorageKey();
      const p = readKey(primaryKey) || readKey(LS_KEY_EN_NAMES);
      if (p) return p;
      const b = readKey(primaryKey + STORAGE_BACKUP_SUFFIX) || readKey(LS_KEY_EN_NAMES + STORAGE_BACKUP_SUFFIX);
      if (b) {
        englishNamesRestoredFromBackup = true;
        return b;
      }
      return {};
    }

    function saveEnglishByIndex(map) {
      try {
        const key = currentEnglishNameStorageKey();
        const s = JSON.stringify(map || {});
        localStorage.setItem(key, s);
        localStorage.setItem(key + STORAGE_BACKUP_SUFFIX, s);
      } catch (_e) {
        /* ignore */
      }
    }

    let englishByIndex = loadEnglishByIndex();

    function getEnglishNameForIndex(seq) {
      const k = String(seq != null ? seq : "");
      const v = englishByIndex[k];
      return v != null ? String(v).trim() : "";
    }

    function loadShowEnSub() {
      try {
        return localStorage.getItem(LS_KEY_SHOW_EN_SUB) === "1";
      } catch (_e) {
        return false;
      }
    }

    function saveShowEnSub(on) {
      try {
        localStorage.setItem(LS_KEY_SHOW_EN_SUB, on ? "1" : "0");
      } catch (_e) {
        /* ignore */
      }
    }

    function syncLangRadios() {
      const p = getLangPref();
      document.querySelectorAll('input[name="ui-lang"]').forEach((inp) => {
        if (!(inp instanceof HTMLInputElement)) return;
        inp.checked = p ? inp.value === p : inp.value === "auto";
      });
    }

    function applySidebarI18n() {
      const L = I18N[getEffectiveUiLang()] || I18N.zh;
      const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
      };
      const setText = (id, t) => {
        const el = document.getElementById(id);
        if (el) el.textContent = t;
      };
      setText("sidebar-title-main", L.sidebarTitle);
      setHtml("sidebar-intro-lead", L.sidebarIntro);
      setText("label-lang-box", L.labelLangBox);
      setText("lbl-lang-auto", L.lblLangAuto);
      setText("lbl-lang-zh", L.lblLangZh);
      setText("lbl-lang-en", L.lblLangEn);
      setText("lbl-show-en-sub", L.lblShowEnSub);
      setText("label-slot-config", L.labelSlotConfig);
      setText("label-start-time", L.labelStartTime);
      setText("label-lesson-duration", L.labelLessonDuration);
      setText("label-mid-rest", L.labelMidRest);
      setText("label-break-rest", L.labelBreakRest);
      setText("label-noon-break", L.labelNoonBreak);
      setText("label-evening-break", L.labelEveningBreak);
      const btnSampleZh = document.getElementById("btn-enroll-sample-zh");
      if (btnSampleZh) btnSampleZh.textContent = L.btnSampleZhExcel;
      const btnSampleEn = document.getElementById("btn-enroll-sample-en");
      if (btnSampleEn) btnSampleEn.textContent = L.btnSampleEnExcel;
      const btnComputeSlots = document.getElementById("btn-compute-slots");
      if (btnComputeSlots) btnComputeSlots.textContent = L.btnComputeSlots;
      const bp = document.getElementById("btn-print");
      if (bp) bp.textContent = L.btnPrint;
      const be = document.getElementById("btn-export-pdf");
      if (be) be.textContent = L.btnExportPdf;
      const bd = document.getElementById("btn-demo");
      if (bd) bd.textContent = L.btnDemo;
      const ba = document.getElementById("btn-autofill-schedule");
      if (ba) ba.textContent = L.btnAutofill;
      const bs = document.getElementById("btn-save-manual");
      if (bs) bs.textContent = L.btnSaveManual;
      const bc = document.getElementById("btn-clear");
      if (bc) bc.textContent = L.btnClear;
      const bu = document.getElementById("btn-undo");
      if (bu) bu.textContent = L.btnUndo;
      const br = document.getElementById("btn-redo");
      if (br) br.textContent = L.btnRedo;
      const leadEl = document.getElementById("preview-rail-lead");
      if (leadEl) leadEl.innerHTML = L.previewHintLead;
      applyTotalsLabels();
      const cxl = document.getElementById("export-check-cancel");
      const okb = document.getElementById("export-check-ok");
      if (cxl) cxl.textContent = L.exportCancel;
      if (okb) okb.textContent = L.exportContinue;
      const ch = document.getElementById("cache-clear-hint");
      const cb = document.getElementById("btn-cache-clear");
      if (ch) ch.textContent = L.cacheClearHint;
      if (cb) cb.textContent = L.cacheClearBtn;
      const bib = document.getElementById("btn-import-backup");
      if (bib) bib.textContent = L.importBackupBtn;
      const cls = document.getElementById("compliance-log-summary");
      if (cls) cls.textContent = L.activityLog;
      const sct = document.getElementById("service-consent-banner-text");
      const scb = document.getElementById("service-consent-banner-btn");
      if (sct) sct.textContent = L.serviceConsentBannerText;
      if (scb) scb.textContent = L.serviceConsentBannerBtn;
      // 版式说明
      const labelLayout = document.getElementById("label-layout-box");
      if (labelLayout) labelLayout.textContent = L.labelLayout;
      const layoutNote1 = document.getElementById("layout-note-1");
      if (layoutNote1) layoutNote1.innerHTML = L.layoutNote1;
      const layoutNote2 = document.getElementById("layout-note-2");
      if (layoutNote2) layoutNote2.innerHTML = L.layoutNote2;
      // 选课表操作按钮
      const btnImport = document.getElementById("btn-enroll-import");
      if (btnImport) btnImport.textContent = L.btnEnrollImport;
      const btnReset = document.getElementById("btn-enroll-reset");
      if (btnReset) btnReset.textContent = L.btnEnrollReset;
      // 侧栏开关 title
      const sidebarToggle = document.getElementById("sidebar-open-toggle");
      if (sidebarToggle) sidebarToggle.title = L.sidebarToggleTitle;
      // 导出申请包按钮
      const btnPkg = document.getElementById("btn-export-package");
      if (btnPkg) btnPkg.textContent = L.btnExportPackage;
      // save-toast 文案
      const saveToastEl = document.getElementById("save-toast");
      if (saveToastEl) saveToastEl.textContent = L.saveToast;
      renderComplianceLogPanel();
      renderPersistentStatusBar();
    }

    function applyTotalsLabels() {
      const L = I18N[getRenderLang()] || I18N.zh;
      const a = document.getElementById("lbl-totals-courses");
      const b = document.getElementById("lbl-totals-credits");
      if (a) a.textContent = L.totalsCourses;
      if (b) b.textContent = L.totalsCredits;
    }

    function applySheetStaticI18n() {
      const L = I18N[getRenderLang()] || I18N.zh;
      const h1 = document.querySelector("header.doc-head h1");
      if (h1) h1.textContent = L.docTitle;
      const lead = document.querySelector("header.doc-head p.lead");
      if (lead) lead.textContent = L.docLead;
      const he = document.getElementById("h-enroll");
      if (he) he.textContent = L.hEnroll;
      const hs = document.getElementById("h-sched");
      if (hs) hs.textContent = L.hSched;
      const foot = document.querySelector("footer.note");
      if (foot) foot.textContent = L.footerNote;
      const rim = document.querySelector(".rim-note");
      if (rim) rim.textContent = L.rimNote;
      const metaBar = document.getElementById("meta-bar");
      const srcLabel = metaBar && metaBar.querySelector("[data-meta-src-label]");
      const termLabel = metaBar && metaBar.querySelector("[data-meta-term-label]");
      if (srcLabel) srcLabel.textContent = L.metaSource;
      if (termLabel) termLabel.textContent = L.metaTerm;
    }

    // toHalfWidthChars → window.__tsBridge
    function toHalfWidthChars(s) { return window.__tsBridge.toHalfWidthChars(s); }

    function bindLangControlsOnce() {
      const root = document.getElementById("sidebar-editor");
      if (!root || root.dataset.langControlsBound) return;
      root.dataset.langControlsBound = "1";
      root.addEventListener("change", (ev) => {
        const t = ev.target;
        if (t instanceof HTMLInputElement && t.name === "ui-lang") {
          const v = t.value;
          /* 语言切换前先保留当前数据，确保只切换表头与界面文案，不丢失正在编辑的选课/课表内容。 */
          try {
            flushPersistGridNow();
            flushEnrollSaveNow();
          } catch (_e) {
            /* ignore */
          }
          setLangPref(v === "auto" ? "" : v);
          // 切换语言后从对应语言存储键加载数据，若无则使用该语言默认范本
          const newLang = getEffectiveUiLang();
          const storedForLang = loadEnrollFromStorage();
          if (storedForLang) {
            enrollData = storedForLang;
            normalizeEnrollShape(enrollData, { restoredFromStorage: true });
          } else {
            enrollData = newLang === "en" ? cloneEnroll(ENROLL_SAMPLE_EN) : cloneEnroll(ENROLL_DEFAULT);
            normalizeEnrollShape(enrollData, { restoredFromStorage: true });
          }
          lastEnrollRenderKey = "";
          syncLangRadios();
          applySidebarI18n();
          renderEnroll();
          renderGrid();
          refreshAllResolved();
          applySheetStaticI18n();
          applyTotalsLabels();
          scheduleA3PreviewScale();
          scheduleAppStateCommit();
        }
      });
      syncLangRadios();
      applySidebarI18n();
    }

    /** 选课表「课程名称」列就地编辑：编辑期间不刷新；仅在 Enter 或 blur 提交 */
    function bindEnrollCourseNameEditableOnce() {
      const tbl = document.getElementById("enroll-table");
      if (!tbl || tbl.dataset.cnNameEditBound) return;
      tbl.dataset.cnNameEditBound = "1";
      const commitEnrollCourseName = (cellEl) => {
        if (!(cellEl instanceof HTMLElement) || !cellEl.classList.contains("cell-cn-name")) return;
        const idx = parseInt(cellEl.getAttribute("data-course-index") || "", 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= enrollData.courses.length) return;
        const trimmed = cellEl.textContent.trim();
        cellEl.textContent = trimmed;
        enrollData.courses[idx].课程名称 = trimmed;
        saveEnrollToStorage(enrollData, true);
        appendComplianceEvent("enroll_cell_edit", { courseIndex: idx, field: "课程名称" });
        lastEnrollRenderKey = "";
        refreshAllResolved();
        scheduleAppStateCommit();
      };
      tbl.addEventListener(
        "keydown",
        (ev) => {
          const t = ev.target;
          if (!(t instanceof HTMLElement) || !t.classList.contains("cell-cn-name")) return;
          if (ev.key !== "Enter") return;
          ev.preventDefault();
          commitEnrollCourseName(t);
          t.blur();
        },
        true
      );
      tbl.addEventListener(
        "blur",
        (ev) => {
          const t = ev.target;
          if (!(t instanceof HTMLElement) || !t.classList.contains("cell-cn-name")) return;
          commitEnrollCourseName(t);
        },
        true
      );
      tbl.addEventListener("paste", (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLElement) || !t.classList.contains("cell-cn-name")) return;
        ev.preventDefault();
        const text = (ev.clipboardData || window.clipboardData).getData("text/plain").replace(/\r?\n/g, " ");
        try {
          document.execCommand("insertText", false, text);
        } catch (_e) {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
        }
      });
    }

    function bindCacheClearOnce() {
      const btn = document.getElementById("btn-cache-clear");
      if (!btn || btn.dataset.cacheClearBound) return;
      btn.dataset.cacheClearBound = "1";
      btn.addEventListener("click", () => {
        const L = I18N[getEffectiveUiLang()] || I18N.zh;
        if (!window.confirm(L.cacheClearConfirm)) return;
        const wantBackup = window.confirm(L.cacheClearOfferBackup);
        if (wantBackup) {
          try {
            downloadProjectJsonBackup();
          } catch (err) {
            logError("downloadProjectJsonBackup", err);
          }
        }
        LS_KEYS_ALL_TOOL.forEach((k) => {
          try {
            localStorage.removeItem(k);
            localStorage.removeItem(k + STORAGE_BACKUP_SUFFIX);
          } catch (_e) {
            /* ignore */
          }
        });
        // 额外清除可能遗漏的键
        try {
          localStorage.removeItem("courseScheduleSlotParamsV1");
          localStorage.removeItem("courseScheduleSlotParamsV1" + STORAGE_BACKUP_SUFFIX);
        } catch (_e) { /* ignore */ }
        // 重置内存数据，确保刷新前不残留
        enrollData = cloneEnroll(ENROLL_DEFAULT);
        undoStack = [];
        redoStack = [];
        writeGridStorage(Object.create(null));
        // 同时清除所有 sessionStorage 标记，确保刷新后回到初次打开状态
        try {
          sessionStorage.removeItem(SESSION_KEY_PAGE_SESSION_ACTIVE);
          sessionStorage.removeItem(SESSION_KEY_REFRESH_MARK);
          sessionStorage.removeItem(SESSION_KEY_SERVICE_CONSENT_NAME_HASH);
        } catch (_e) {
          /* ignore */
        }
        window.location.reload();
      });
    }

    function bindImportBackupOnce() {
      const btn = document.getElementById("btn-import-backup");
      const input = document.getElementById("input-import-backup");
      if (!btn || !input || btn.dataset.importBackupBound) return;
      btn.dataset.importBackupBound = "1";
      btn.addEventListener("click", () => { input.value = ""; input.click(); });
      input.addEventListener("change", () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const L = I18N[getEffectiveUiLang()] || I18N.zh;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const obj = JSON.parse(String(e.target.result || ""));
            if (!obj || typeof obj !== "object") throw new Error("invalid");
            if (obj.enroll) {
              enrollData = obj.enroll;
              normalizeEnrollShape(enrollData, { restoredFromStorage: true });
              saveEnrollToStorage(enrollData, true);
            }
            if (obj.grid) writeGridStorage(obj.grid);
            if (obj.slotTimes) {
              try { localStorage.setItem(LS_KEY_SLOT_PARAMS, JSON.stringify(obj.slotTimes)); } catch (_e) { /* ignore */ }
            }
            if (obj.uiLangPref) setLangPref(obj.uiLangPref);
            lastEnrollRenderKey = "";
            applySlotParamsToInputs();
            renderEnroll();
            renderGrid();
            refreshAllResolved();
            commitAppStateSnapshotNow();
            updateStatusLastError(L.importBackupSuccess);
            const ve = document.getElementById("status-value-error");
            if (ve) { ve.style.color = "#15803d"; ve.style.whiteSpace = ""; }
            showEnrollImportToast(L.importBackupSuccess);
          } catch (_err) {
            const L2 = I18N[getEffectiveUiLang()] || I18N.zh;
            updateStatusLastError(L2.importBackupFail);
            const ve = document.getElementById("status-value-error");
            if (ve) { ve.style.color = "#b45309"; ve.classList.add("translation-warn-blink"); }
          }
        };
        reader.readAsText(f, "utf-8");
      });
    }

    let gridInputDebounceTimer = null;
    /** 选课表课程名 contenteditable：合并 localStorage 写入与全格刷新，减轻每键一次全表扫描 */
    let enrollCourseNameFlushTimer = null;
    const ENROLL_NAME_FLUSH_MS = 140;
    let a3ScaleRafId = null;
    let lastEnrollRenderKey = "";
    let undoStack = [];
    let redoStack = [];
    const APP_HISTORY_MAX = 30;
    const APP_STATE_COMMIT_DEBOUNCE_MS = 450;
    let appStateCommitTimer = null;
    let isApplyingAppState = false;

    /** 选课表「上课时间」解析后三门及以上课程落在同一周课格子，且当前格内上、下栏均已填写序号时，用于溢出标记与导出前检查 */
    let overflowTripleSameSlotCellIds = new Set();

    function logError(context, error) {
      const e = error instanceof Error ? error : new Error(String(error));
      console.error(`[CourseTool] ${context}: ${e.message}`);
    }

    function showEnrollImportError(context, err) {
      const e = err instanceof Error ? err : new Error(String(err));
      logError(context, e);
      updateStatusLastError(`${context}：${e.message}`);
      showEnrollImportToast(e.message);
    }

    const LS_KEY_SLOT_PARAMS = "courseScheduleSlotParamsV1";
    const SLOT_PARAM_DEFAULTS = {
      startTime: "08:00",
      lessonMin: 45,
      breakInnerMin: 5,
      breakAfterMin: 10,
      noonMin: 90,
      eveningMin: 60
    };

    // parseTimeHmToMinutes / formatMinutesToHm / addMinutes → window.__tsBridge
    function parseTimeHmToMinutes(text) { return window.__tsBridge.parseTimeHmToMinutes(text); }
    function formatMinutesToHm(total) { return window.__tsBridge.formatMinutesToHm(total); }
    function addMinutes(base, delta) { return window.__tsBridge.addMinutes(base, delta); }

    let slotParamsRestoredFromBackup = false;

    // normalizeSlotParamsObject → window.__tsBridge.normalizeSlotParams
    function normalizeSlotParamsObject(parsed) {
      return window.__tsBridge.normalizeSlotParams(parsed && typeof parsed === "object" ? parsed : {});
    }

    function loadSlotParams() {
      const primary = CourseTable.utils.safeJsonParse(localStorage.getItem(LS_KEY_SLOT_PARAMS), null);
      if (primary && typeof primary === "object") return normalizeSlotParamsObject(primary);
      const bak = CourseTable.utils.safeJsonParse(localStorage.getItem(LS_KEY_SLOT_PARAMS + STORAGE_BACKUP_SUFFIX), null);
      if (bak && typeof bak === "object") {
        slotParamsRestoredFromBackup = true;
        return normalizeSlotParamsObject(bak);
      }
      return { ...SLOT_PARAM_DEFAULTS };
    }

    function saveSlotParams(params) {
      const next = {
        startTime: params.startTime,
        lessonMin: Math.max(1, parseInt(params.lessonMin, 10) || SLOT_PARAM_DEFAULTS.lessonMin),
        breakInnerMin: Math.max(0, parseInt(params.breakInnerMin, 10) || 0),
        breakAfterMin: Math.max(0, parseInt(params.breakAfterMin, 10) || 0),
        noonMin: Math.max(0, parseInt(params.noonMin, 10) || 0),
        eveningMin: Math.max(0, parseInt(params.eveningMin, 10) || 0)
      };
      try {
        const s = JSON.stringify(next);
        localStorage.setItem(LS_KEY_SLOT_PARAMS, s);
        localStorage.setItem(LS_KEY_SLOT_PARAMS + STORAGE_BACKUP_SUFFIX, s);
      } catch (_e) {
        /* ignore */
      }
      return next;
    }

    // computeSlotTimes → window.__tsBridge
    function computeSlotTimes(params) { return window.__tsBridge.computeSlotTimes(params); }

    function loadSlotTimesMap() {
      return computeSlotTimes(loadSlotParams());
    }

    function getSlotTimeDisplay(slotKey) {
      const m = loadSlotTimesMap();
      return m[slotKey] || SLOT_TIME_DEFAULT;
    }

    function applySlotParamsToInputs() {
      const params = loadSlotParams();
      const map = {
        startTime: "slot-param-start",
        lessonMin: "slot-param-lesson",
        breakInnerMin: "slot-param-inner",
        breakAfterMin: "slot-param-after",
        noonMin: "slot-param-noon",
        eveningMin: "slot-param-evening"
      };
      Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el instanceof HTMLInputElement) {
          el.value = String(params[key]);
        }
      });
    }

    function readSlotParamsFromInputs() {
      const getValue = (id, fallback) => {
        const el = document.getElementById(id);
        return el instanceof HTMLInputElement && el.value != null && el.value !== "" ? el.value : fallback;
      };
      return {
        startTime: getValue("slot-param-start", SLOT_PARAM_DEFAULTS.startTime),
        lessonMin: getValue("slot-param-lesson", SLOT_PARAM_DEFAULTS.lessonMin),
        breakInnerMin: getValue("slot-param-inner", SLOT_PARAM_DEFAULTS.breakInnerMin),
        breakAfterMin: getValue("slot-param-after", SLOT_PARAM_DEFAULTS.breakAfterMin),
        noonMin: getValue("slot-param-noon", SLOT_PARAM_DEFAULTS.noonMin),
        eveningMin: getValue("slot-param-evening", SLOT_PARAM_DEFAULTS.eveningMin)
      };
    }

    function applyAndSaveSlotParams() {
      const saved = saveSlotParams(readSlotParamsFromInputs());
      renderGrid();
      scheduleA3PreviewScale();
      scheduleAppStateCommit();
      markStatusAutosaveNow();
      updateStatusLastAction(getEffectiveUiLang() === "en" ? "Period times recalculated and applied." : "课次时间已重新计算并应用。");
      flashSaveToast(1200);
      return saved;
    }

    function bindSlotParamInputsOnce() {
      const btn = document.getElementById("btn-compute-slots");
      const box = document.getElementById("slot-config-toolbox");
      if (btn instanceof HTMLButtonElement && btn.dataset.bound !== "1") {
        btn.dataset.bound = "1";
        btn.addEventListener("click", () => applyAndSaveSlotParams());
      }
      if (box instanceof HTMLElement && box.dataset.paramInputsBound !== "1") {
        box.dataset.paramInputsBound = "1";
        let slotParamDebounceTimer = null;
        const debouncedApply = () => {
          window.clearTimeout(slotParamDebounceTimer);
          slotParamDebounceTimer = window.setTimeout(() => {
            slotParamDebounceTimer = null;
            applyAndSaveSlotParams();
          }, 300);
        };
        box.addEventListener("input", (ev) => {
          const t = ev.target;
          if (!(t instanceof HTMLInputElement) || !t.dataset.slotParam) return;
          window.clearTimeout(slotParamDebounceTimer);
          slotParamDebounceTimer = window.setTimeout(() => {
            slotParamDebounceTimer = null;
            saveSlotParams(readSlotParamsFromInputs());
            scheduleAppStateCommit();
          }, 300);
        });
        box.addEventListener("change", (ev) => {
          const t = ev.target;
          if (!(t instanceof HTMLInputElement) || !t.dataset.slotParam) return;
          debouncedApply();
        });
      }
    }

    function byIndex(n) {
      const i = parseInt(String(n).trim(), 10);
      if (!Number.isFinite(i) || i < 1) return null;
      return enrollData.courses.find((c) => Number(c.序号) === i) || null;
    }

    /** 课程代号列已移除，统一使用教学班号作为代号展示 */
    // courseCodeFromRow → window.__tsBridge
    function courseCodeFromRow(c) { return window.__tsBridge.courseCodeFromRow(c); }

    function parseCellId(cellDataId) { return window.__tsBridge.parseCellId(cellDataId); }

    function normalizeScheduleText(s) {
      return String(s).replace(/\u2013|\u2014|—/g, "-").replace(/\s+/g, "");
    }

    /** 选课表常见「星期一 / 星期六」与表头「周一 / 周六」等写法对齐，用于 schedulePartMatchesCell */
    function scheduleDayMatchLabels(dayKey) {
      const pairs = {
        mon: ["周一", "星期一", "Monday", "Mon"],
        tue: ["周二", "星期二", "Tuesday", "Tue"],
        wed: ["周三", "星期三", "Wednesday", "Wed"],
        thu: ["周四", "星期四", "Thursday", "Thu"],
        fri: ["周五", "星期五", "Friday", "Fri"],
        sat: ["周六", "星期六", "Saturday", "Sat"],
        sun: ["周日", "星期日", "星期天", "周天", "Sunday", "Sun"]
      };
      const arr = pairs[dayKey];
      if (!arr) return [];
      return arr.map((x) => normalizeScheduleText(x));
    }

    /** 选课表「星期三第3-4节 / 第3节…」与当前格（wed + p34）对齐，用于自动摘取对应片段 */
    function slotSegmentRegex(slotKey) {
      const bounds = slotLessonBounds(slotKey);
      if (!bounds) return null;
      const { lo, hi } = bounds;
      const singleList = [];
      for (let n = lo; n <= hi; n++) singleList.push(`第${n}节`);
      const pair = `第${lo}[-、]?${hi}节`;
      return new RegExp(`(?:${pair}|${singleList.join("|")})`);
    }

    function schedulePartMatchesCell(part, dayKey, slotKey) {
      const day = DAYS.find((d) => d.key === dayKey);
      if (!day || !part) return false;
      const p = normalizeScheduleText(toHalfWidthChars(part));
      const labels = scheduleDayMatchLabels(dayKey);
      if (!labels.some((lab) => p.includes(lab))) return false;
      const re = slotSegmentRegex(slotKey);
      if (!re) return true;
      const raw = String(part).replace(/\u2013|\u2014|—/g, "-");
      return re.test(raw);
    }

    function segmentIndexForCellTime(timeFull, dayKey, slotKey) {
      const full = timeFull != null ? String(timeFull).trim() : "";
      if (!full) return -1;
      const parts = full.split(/[;；]/).map((x) => toHalfWidthChars(x).trim()).filter(Boolean);
      for (let i = 0; i < parts.length; i++) {
        if (schedulePartMatchesCell(parts[i], dayKey, slotKey)) return i;
      }
      return -1;
    }

    /** 周课表格：从选课表原文摘「当前星期·节次」对应段；摘不到则用格位 + 侧栏时段作上课时间 */
    function resolveCellTimeDisplay(c, dayKey, slotKey) {
      const full = c.上课时间 != null ? String(c.上课时间).trim() : "";
      const idx = segmentIndexForCellTime(full, dayKey, slotKey);
      if (idx >= 0) {
        const parts = full.split(/[;；]/).map((x) => x.trim());
        const one = parts[idx];
        if (one) return one;
      }
      if (full) {
        const n = full.split(/[;；]/).map((x) => x.trim()).filter(Boolean).length;
        if (n <= 1 && schedulePartMatchesCell(full, dayKey, slotKey)) return full;
      }
      return buildGridFallbackClassTime(dayKey, slotKey);
    }

    function resolveCellPlaceDisplay(c, dayKey, slotKey) {
      const placeFull = c.上课地点 != null ? String(c.上课地点).trim() : "";
      if (!placeFull) return "—";
      const timeFull = c.上课时间 != null ? String(c.上课时间).trim() : "";
      const idx = segmentIndexForCellTime(timeFull, dayKey, slotKey);
      const pparts = placeFull.split(/[;；]/).map((x) => x.trim()).filter(Boolean);
      if (idx >= 0 && pparts[idx]) return pparts[idx];
      if (pparts.length === 1) return pparts[0];
      const uniq = [...new Set(pparts)];
      if (uniq.length === 1) return uniq[0];
      if (pparts.length > 0) return pparts[0];
      return placeFull;
    }

    function buildGridFallbackClassTime(dayKey, slotKey) {
      const day = DAYS.find((d) => d.key === dayKey);
      const slot = SLOTS.find((s) => s.key === slotKey);
      if (!day || !slot) return "—";
      let line = `${dayLabelForSheet(dayKey)}·${slotLabelForSheet(slot.key)}`;
      const slotLine = getSlotTimeDisplay(slotKey);
      if (slotLine && slotLine !== SLOT_TIME_DEFAULT) {
        line += " " + slotLine;
      }
      return line;
    }

    function renderEnroll() {
      const thead = document.querySelector("#enroll-table thead");
      const tbody = document.querySelector("#enroll-table tbody");
      const tbl = document.getElementById("enroll-table");
      const lang = getRenderLang();
      const hideOnline = pdfExportHideOnline;
      const renderKey = JSON.stringify({
        headers: enrollData.headers,
        courses: enrollData.courses,
        lang,
        hideOnline
      });
      if (renderKey === lastEnrollRenderKey) return;
      lastEnrollRenderKey = renderKey;
      if (tbl) {
        tbl.classList.toggle("hide-col-online", hideOnline);
      }
      const cols = ["序号", ...enrollData.headers].filter((c) => !(hideOnline && c === "网课"));
      thead.innerHTML =
        "<tr>" +
        cols
          .map((c) => {
            const thCls = c === "网课" ? "cell-online" : "";
            const lab = headerLabelForSheet(c);
            return `<th scope="col"${thCls ? ` class="${thCls}"` : ""}>${escapeHtml(lab)}</th>`;
          })
          .join("") +
        "</tr>";

      let sum = 0;
      tbody.innerHTML = enrollData.courses
        .map((row, rowIdx) => {
          const cr = parseFloat(row.学分);
          if (Number.isFinite(cr)) sum += cr;
          const seqDisp = row.序号 != null ? row.序号 : "";
          return (
            `<tr class="enroll-row-clickable" data-course-index="${rowIdx}" title="点击定位到周课表">` +
            cols
              .map((c) => {
                if (c === "网课") {
                  const on = row.网课 ? " checked" : "";
                  return `<td class="cell-online"><input type="checkbox" class="chk-online no-print" data-course-index="${rowIdx}"${on} aria-label="标记为网课（无固定星期节次，不排周课表）" /></td>`;
                }
                if (c === "序号") {
                  const v = row[c] != null ? row[c] : "";
                  const numTxt = row.网课 ? `*${String(v)}` : String(v);
                  return `<td class="num">${escapeHtml(numTxt)}</td>`;
                }
                const v = row[c] != null ? row[c] : "";
                if (c === "课程类别") {
                  const catCls = enrollCategoryTdClass(v);
                  return `<td class="break ${catCls}">${escapeHtml(String(v))}</td>`;
                }
                if (c === "课程名称") {
                  const inner = escapeHtml(String(v));
                  const hint = escapeHtml(tr("enrollNameEditableHint"));
                  return `<td class="break cell-cn-name" contenteditable="true" spellcheck="false" data-course-index="${rowIdx}" aria-label="${hint}">${inner}</td>`;
                }
                const cls = c === "上课时间" || c === "上课地点" ? "break" : "";
                return `<td class="${cls}">${escapeHtml(String(v))}</td>`;
              })
              .join("") +
            "</tr>"
          );
        })
        .join("");

      const maxIndex = enrollData.courses.length ? Math.max(...enrollData.courses.map((c) => c.序号)) : 0;
      document.getElementById("n-courses").textContent = String(maxIndex);
      document.getElementById("sum-credits").textContent = sum.toFixed(2);
      const first = enrollData.courses[0];
      const Lmeta = I18N[getRenderLang()] || I18N.zh;
      const termDash = Lmeta.termDash || "—";
      const termText = first
        ? lang === "en"
          ? `${first.学年} · ${formatSemesterLabel(first.学期, "en")}`
          : `${first.学年} 学年 ${formatSemesterLabel(first.学期, "zh")}`
        : termDash;
      document.getElementById("meta-term").textContent = termText;
      setMetaSourceFromEnroll();
      bindEnrollOnlineCheckboxesOnce();
      bindEnrollCourseNameEditableOnce();
      applyTotalsLabels();
      applySheetStaticI18n();
    }

    function bindEnrollOnlineCheckboxesOnce() {
      const tbl = document.getElementById("enroll-table");
      if (!tbl || tbl.dataset.onlineChkBound) return;
      tbl.dataset.onlineChkBound = "1";
      tbl.addEventListener("change", (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLInputElement) || !t.classList.contains("chk-online")) return;
        const idx = parseInt(t.getAttribute("data-course-index") || "", 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= enrollData.courses.length) return;
        enrollData.courses[idx].网课 = Boolean(t.checked);
        enrollData.courses[idx].网课来源 = "manual";
        saveEnrollToStorage(enrollData, true);
        lastEnrollRenderKey = "";
        appendComplianceEvent("enroll_cell_edit", { courseIndex: idx, field: "网课" });
        renderEnroll();
        scheduleAppStateCommit();
      });
      tbl.addEventListener("click", (ev) => {
        const row = ev.target instanceof HTMLElement ? ev.target.closest("tr[data-course-index]") : null;
        if (!(row instanceof HTMLTableRowElement)) return;
        if (ev.target instanceof HTMLElement && (ev.target.closest("input") || ev.target.closest("[contenteditable='true']"))) return;
        const idx = parseInt(row.getAttribute("data-course-index") || "", 10);
        if (!Number.isFinite(idx) || idx < 0 || idx >= enrollData.courses.length) return;
        const course = enrollData.courses[idx];
        const placements = parseCourseToSchedulePlacements(course);
        placements.forEach((p, i) => {
          const targetId = cellId(p.dayKey, p.slotKey);
          const el = document.querySelector(`.cell[data-cell="${targetId}"]`);
          if (!(el instanceof HTMLElement)) return;
          window.setTimeout(() => {
            el.classList.remove("cell--highlight-flash");
            void el.offsetWidth;
            el.classList.add("cell--highlight-flash");
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            window.setTimeout(() => el.classList.remove("cell--highlight-flash"), 1500);
          }, i * 180);
        });
      });
    }

    // escapeHtml / enrollCategoryTdClass / courseCategoryIsFuzzy / cellId → window.__tsBridge
    function escapeHtml(s) { return window.__tsBridge.escapeHtml(s); }
    function enrollCategoryTdClass(catRaw) { return window.__tsBridge.enrollCategoryTdClass(catRaw); }
    function courseCategoryIsFuzzy(catRaw) { return window.__tsBridge.courseCategoryIsFuzzy(catRaw); }
    function cellId(day, slot) { return window.__tsBridge.cellId(day, slot); }

    function renderGrid() {
      const table = document.getElementById("schedule-grid");
      if (!table) return;
      const corner = trSheet("gridCorner");
      const dph = trSheet("gridDayPartHead");
      let head =
        "<thead><tr>" +
        `<th class="day-part-head" scope="col"><span class="day-part-h-label" aria-hidden="true">${escapeHtml(dph)}</span></th>` +
        `<th class="slot-head" scope="col">${escapeHtml(corner)}</th>`;
      head += DAYS.map((d) => `<th scope="col" class="grid-day-col">${escapeHtml(dayLabelForSheet(d.key))}</th>`).join("");
      head += "</tr></thead><tbody>";

      const saved = Object.assign(Object.create(null), gridModel);

      const body = SLOTS.map((slot, slotIndex) => {
        const partCell = dayPartLeadingCell(slotIndex);
        const cells = DAYS.map((day) => {
          const id = cellId(day.key, slot.key);
          const v = saved[id] != null ? saved[id] : "";
          return `<td class="grid-day-col"><div class="cell" data-cell="${id}">${cellInnerHtml(id, v)}</div></td>`;
        }).join("");
        const timeLine = getSlotTimeDisplay(slot.key);
        const timeHtml = timeLine
          ? `<span class="slot-time">${escapeHtml(timeLine)}</span>`
          : "";
        const slotLab = slotLabelForSheet(slot.key);
        const thInner =
          `<span class="th-slot-inner"><span class="slot-label">${escapeHtml(slotLab)}</span>${timeHtml}</span>`;
        return `<tr>${partCell}<th scope="row">${thInner}</th>${cells}</tr>`;
      }).join("");

      table.style.display = "none";
      table.innerHTML = head + body + "</tbody>";
      void table.offsetHeight;
      table.style.display = "";
      bindGridInputs();
      requestAnimationFrame(() => {
        refreshAllResolved();
        syncOverflowTripleSameSlotUi();
      });
      updateUndoButtonState();
    }

    const dirtyCellIds = new Set();
    let dirtyCellsFlushRaf = null;

    function flushPendingGridCellsNow() {
      if (dirtyCellsFlushRaf != null) {
        cancelAnimationFrame(dirtyCellsFlushRaf);
        dirtyCellsFlushRaf = null;
      }
      if (!dirtyCellIds.size) return;
      const ids = Array.from(dirtyCellIds);
      dirtyCellIds.clear();
      ids.forEach((cid) => updateCellDisplay(cid));
      syncOverflowTripleSameSlotUi();
    }

    function markCellDirty(id) {
      if (!id) return;
      dirtyCellIds.add(id);
      if (dirtyCellsFlushRaf != null) return;
      dirtyCellsFlushRaf = requestAnimationFrame(() => {
        dirtyCellsFlushRaf = null;
        flushPendingGridCellsNow();
      });
    }

    function cellInnerHtml(id, value) {
      const [va, vb, vc] = splitCellBands(value);
      const thirdActive = activeThirdBandCellIds.has(id) || Boolean(vc);
      const slotRow =
        `<div class="cell-slot cell-slot--name" data-part="name"></div>` +
        `<div class="cell-slot cell-slot--name-en" data-part="name-en"></div>` +
        `<div class="cell-slot cell-slot--week-hint" data-part="week-hint"></div>` +
        `<div class="cell-slot cell-slot--time" data-part="time"></div>` +
        `<div class="cell-slot cell-slot--place" data-part="place"></div>` +
        `<div class="cell-slot cell-slot--code" data-part="code"></div>`;
      const bandHtml = (band, value, placeholder, ariaLabel, hidden) =>
        `<div class="cell-band" data-band="${band}"${hidden ? ' style="display:none"' : ""}>` +
        `<input class="idx-band no-print" type="text" inputmode="numeric" maxlength="4" data-id="${id}" data-band="${band}" value="${escapeHtml(value)}" placeholder="${placeholder}" aria-label="${ariaLabel}" />` +
        `<div class="cell-stack">${slotRow}</div>` +
        `</div>`;
      return (
        `<span class="cell-hint no-print" aria-hidden="true">上、中、下三栏可递进填写选课序号</span>` +
        `<div class="cell-display cell--solo-center" data-display="${id}" aria-live="polite" data-third-active="${thirdActive ? "1" : "0"}">` +
        `<div class="cell-band-actions no-print">` +
        `<button type="button" class="cell-band-action" data-action="add-band" data-id="${id}" aria-label="添加第三门课" title="添加第三门课程（需先填写中栏序号）">+</button>` +
        `<button type="button" class="cell-band-action" data-action="remove-band" data-id="${id}" aria-label="移除第三门课" title="移除第三门课程">-</button>` +
        `</div>` +
        `<p class="cell-err-msg" hidden></p>` +
        `<div class="cell-bands">` +
        bandHtml("0", va, "上栏", "上栏选课序号", false) +
        `<div class="cell-band-split" data-split="0" aria-hidden="true" hidden></div>` +
        bandHtml("1", vb, "中栏", "中栏选课序号", true) +
        `<div class="cell-band-split" data-split="1" aria-hidden="true" hidden></div>` +
        bandHtml("2", vc, "下栏", "下栏选课序号", !thirdActive) +
        `</div></div>`
      );
    }

    function bindGridInputs() {
      const table = document.getElementById("schedule-grid");
      if (!table || table.dataset.gridInputDelegateBound) return;
      table.dataset.gridInputDelegateBound = "1";
      table.addEventListener("input", (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLInputElement) || !t.classList.contains("idx-band")) return;
        const id = t.dataset.id;
        if (!id) return;
        const wrap = t.closest("[data-display]");
        const bandNo = parseInt(String(t.dataset.band || ""), 10);
        if (wrap instanceof HTMLElement && bandNo === 0) {
          const band1Wrap = wrap.querySelector('.cell-band[data-band="1"]');
          if (band1Wrap instanceof HTMLElement) {
            band1Wrap.style.display = t.value.trim() ? "" : "none";
          }
        }
        if (wrap instanceof HTMLElement && bandNo === 2) {
          if (t.value.trim()) wrap.removeAttribute("data-third-pending");
        }
        window.clearTimeout(gridInputDebounceTimer);
        gridInputDebounceTimer = window.setTimeout(() => {
          gridInputDebounceTimer = null;
          persistGridSoon();
        }, 200);
      });
      table.addEventListener("click", (ev) => {
        const btn = ev.target;
        if (!(btn instanceof HTMLButtonElement) || !btn.classList.contains("cell-band-action")) return;
        const id = btn.dataset.id;
        if (!id) return;
        const cell = document.querySelector(`.cell[data-cell="${id}"]`);
        const wrap = cell ? cell.querySelector(`[data-display="${id}"]`) : null;
        if (!cell || !wrap) return;
        const band1 = cell.querySelector('input.idx-band[data-band="1"]');
        const band2 = cell.querySelector('input.idx-band[data-band="2"]');
        const band2Wrap = cell.querySelector('.cell-band[data-band="2"]');
        if (!(band1 instanceof HTMLInputElement) || !(band2 instanceof HTMLInputElement) || !(band2Wrap instanceof HTMLElement) || !(wrap instanceof HTMLElement)) return;
        if (btn.dataset.action === "add-band") {
          if (!band1.value.trim()) {
            window.alert(getEffectiveUiLang() === "en" ? "Please fill the middle band first." : "请先填写中栏。");
            return;
          }
          activeThirdBandCellIds.add(id);
          saveStoredActiveThirdBands(activeThirdBandCellIds);
          wrap.dataset.thirdActive = "1";
          band2Wrap.style.display = "";
          markCellDirty(id);
          if (!band2.value.trim()) band2.focus();
          persistGridSoon();
          return;
        }
        if (btn.dataset.action === "remove-band") {
          band2.value = "";
          wrap.removeAttribute("data-third-pending");
          activeThirdBandCellIds.delete(id);
          saveStoredActiveThirdBands(activeThirdBandCellIds);
          wrap.dataset.thirdActive = "0";
          band2Wrap.style.display = "none";
          markCellDirty(id);
          persistGridSoon();
        }
      });
      table.addEventListener("keydown", (ev) => {
        const t = ev.target;
        if (!(t instanceof HTMLInputElement) || !t.classList.contains("idx-band")) return;
        if (ev.key === "Enter") {
          const id = t.dataset.id;
          const band = parseInt(String(t.dataset.band || ""), 10);
          if (!id || !Number.isFinite(band)) return;
          ev.preventDefault();
          const cell = document.querySelector(`.cell[data-cell="${id}"]`);
          if (!cell) return;
          const orderedBands = [0, 1, 2];
          const pos = orderedBands.indexOf(band);
          if (pos < 0 || pos >= orderedBands.length - 1) {
            return;
          }
          const nextBandNo = orderedBands[pos + 1];
          const nextBand = cell.querySelector(`input.idx-band[data-band="${nextBandNo}"]`);
          const nextWrap = cell.querySelector(`.cell-band[data-band="${nextBandNo}"]`);
          if (nextWrap instanceof HTMLElement && nextWrap.style.display === "none") {
            return;
          }
          if (nextBand instanceof HTMLInputElement && !nextBand.disabled) {
            nextBand.focus();
            nextBand.select();
          }
          return;
        }
        if (ev.key !== "Tab") return;
        const currentCellId = t.dataset.id;
        const currentBand = parseInt(String(t.dataset.band || ""), 10);
        if (!currentCellId || !Number.isFinite(currentBand)) return;
        const allInputs = Array.from(table.querySelectorAll("input.idx-band[data-id]"));
        const visibleInputs = allInputs.filter((inp) => {
          if (!(inp instanceof HTMLInputElement) || inp.disabled) return false;
          const wrap = inp.closest('.cell-band');
          return !(wrap instanceof HTMLElement) || wrap.style.display !== "none";
        });
        const currentIndex = visibleInputs.indexOf(t);
        if (currentIndex < 0) return;
        ev.preventDefault();
        const nextIndex = ev.shiftKey ? currentIndex - 1 : currentIndex + 1;
        const nextInput = visibleInputs[nextIndex];
        if (nextInput instanceof HTMLInputElement) {
          nextInput.focus();
          nextInput.select();
        }
      });
      table.addEventListener(
        "blur",
        (ev) => {
          const t = ev.target;
          if (!(t instanceof HTMLInputElement) || !t.classList.contains("idx-band")) return;
          const id = t.dataset.id;
          if (!id) return;
          window.clearTimeout(gridInputDebounceTimer);
          gridInputDebounceTimer = null;
          markCellDirty(id);
          persistGridSoon();
          // 失焦时立即提交快照，避免防抖期间产生冗余历史导致撤销需连点两次
          commitAppStateSnapshotNow();
        },
        true
      );
    }

    /** 兼容旧数据：从一格字符串里解析 1～3 个序号（+ / 空格等） */
    function parseCellIndexTokens(raw) {
      const s = String(raw).trim();
      if (!s) return [];
      const parts = s.split(/[\s\/|+,;、，；]+/).map((x) => x.trim()).filter(Boolean);
      const out = [];
      for (const p of parts) {
        const n = parseInt(p, 10);
        if (!Number.isFinite(n) || n < 1) continue;
        if (!out.includes(n)) out.push(n);
        if (out.length >= 3) break;
      }
      return out;
    }

    // joinBands / parseBandToken → window.__tsBridge
    function joinBands(a, b, c) { return window.__tsBridge.joinBands(a, b, c); }

    function splitCellBands(v) {
      const s = String(v == null ? "" : v).trim();
      if (!s) return ["", "", ""];
      if (s.includes("|")) {
        const parts = s.split("|");
        return [
          String(parts[0] == null ? "" : parts[0]).trim(),
          String(parts[1] == null ? "" : parts[1]).trim(),
          String(parts[2] == null ? "" : parts[2]).trim()
        ];
      }
      const ids = parseCellIndexTokens(s);
      if (ids.length >= 3) return [String(ids[0]), String(ids[1]), String(ids[2])];
      if (ids.length === 2) return [String(ids[0]), String(ids[1]), ""];
      if (ids.length === 1) return [String(ids[0]), "", ""];
      return ["", "", ""];
    }

    // parseBandToken → window.__tsBridge
    function parseBandToken(v) { return window.__tsBridge.parseBandToken(v); }

    function fillCourseStack(stackRoot, c, dayKey, slotKey) {
      if (!stackRoot || !c) return;
      const norm = (v) => {
        if (v == null) return "";
        return String(v).trim();
      };
      const set = (part, text) => {
        const el = stackRoot.querySelector(`[data-part="${part}"]`);
        if (el) el.textContent = text;
      };
      const dk = dayKey || "";
      const sk = slotKey || "";
      const cnName = norm(c.课程名称) || "—";
      const rl = getRenderLang();
      const weekHint = dk && sk ? weekHintForCell(c, dk, sk) : "";

      if (rl === "en") {
        const enName = getEnglishNameForIndex(c.序号);
        const primary = enName || cnName;
        set("name", primary);
        set("name-en", "");
        set("week-hint", weekHint || "");
      } else {
        set("name", cnName);
        set("name-en", "");
        set("week-hint", weekHint || "");
      }

      set("time", dk && sk ? resolveCellTimeDisplay(c, dk, sk) : norm(c.上课时间) || "—");
      set("place", dk && sk ? resolveCellPlaceDisplay(c, dk, sk) : norm(c.上课地点) || "—");
      set("code", courseCodeFromRow(c) || "—");
    }

    function clearCellCourseSlots(wrap) {
      wrap.querySelectorAll(".cell-slot[data-part]").forEach((el) => {
        el.textContent = "";
      });
    }

    function clearStackSlots(stackRoot) {
      if (!stackRoot) return;
      stackRoot.querySelectorAll(".cell-slot[data-part]").forEach((el) => {
        el.textContent = "";
      });
    }

    function updateCellDisplay(id) {
      const cell = document.querySelector(`.cell[data-cell="${id}"]`);
      const wrap = cell ? cell.querySelector(`[data-display="${id}"]`) : null;
      if (!cell || !wrap) return;
      const errEl = wrap.querySelector(".cell-err-msg");
      const bandsEl = wrap.querySelector(".cell-bands");
      const actionAdd = wrap.querySelector('button[data-action="add-band"]');
      const actionRemove = wrap.querySelector('button[data-action="remove-band"]');
      const inputs = [0, 1, 2].map((band) => cell.querySelector(`input.idx-band[data-band="${band}"]`));
      const bands = [0, 1, 2].map((band) => (bandsEl ? bandsEl.querySelector(`.cell-band[data-band="${band}"]`) : null));
      const splits = [0, 1].map((idx) => (bandsEl ? bandsEl.querySelector(`.cell-band-split[data-split="${idx}"]`) : null));
      if (!errEl || !bandsEl || inputs.some((el) => !(el instanceof HTMLInputElement))) return;

      const values = inputs.map((el) => el.value.trim());
      const stacks = Array.from(bandsEl.querySelectorAll(".cell-band > .cell-stack"));
      const hasA = Boolean(values[0]);
      const hasB = Boolean(values[1]);
      const hasC = Boolean(values[2]);
      const thirdActive = wrap.dataset.thirdActive === "1" || activeThirdBandCellIds.has(id) || hasC;
      const layoutTriple = Boolean(thirdActive && hasB);

      const syncActionButtons = () => {
        if (actionAdd instanceof HTMLButtonElement) {
          actionAdd.disabled = !hasB || layoutTriple;
          actionAdd.hidden = layoutTriple;
        }
        if (actionRemove instanceof HTMLButtonElement) {
          actionRemove.disabled = !thirdActive;
          actionRemove.hidden = !thirdActive;
        }
      };

      const resetBandClasses = () => {
        cell.classList.remove("cell--solo", "cell--solo-center", "cell--solo-bottom", "cell--dual", "cell--triple");
        wrap.classList.remove("cell--solo", "cell--solo-center", "cell--solo-bottom", "cell--dual", "cell--triple");
        bands.forEach((bandEl) => bandEl?.classList.remove("cell-band--empty"));
        splits.forEach((splitEl) => {
          if (splitEl) splitEl.hidden = true;
        });
      };

      const showError = (msg) => {
        cell.classList.remove("cell--filled", "cell--dual", "cell--triple");
        wrap.classList.remove("cell--dual", "cell--triple");
        resetBandClasses();
        cell.classList.add("cell--error");
        errEl.textContent = msg;
        errEl.hidden = false;
        bandsEl.hidden = true;
        clearCellCourseSlots(wrap);
        syncActionButtons();
      };

      const describeBand = (v, nParsed, course) => {
        if (!v) return "（空）";
        if (nParsed === null || (typeof nParsed === "number" && Number.isNaN(nParsed))) {
          return "（须为 1～4 位数字序号）";
        }
        if (!course) return messageForInvalidIndex(nParsed) || "（无此序号）";
        return "有效";
      };

      const bandLabels = ["上栏", "中栏", "下栏"];
      const describeAllBands = (parsed, courses) =>
        bandLabels.map((label, i) => `${label}：${describeBand(values[i], parsed[i], courses[i])}`).join("；");

      cell.classList.remove("cell--filled", "cell--error", "cell--dual", "cell--triple", "cell--blank", "cell--solo", "cell--solo-center", "cell--solo-bottom");
      wrap.classList.remove("cell--filled", "cell--error", "cell--dual", "cell--triple", "cell--blank", "cell--solo", "cell--solo-center", "cell--solo-bottom");
      resetBandClasses();
      errEl.hidden = true;
      errEl.textContent = "（无此序号）";
      bandsEl.hidden = false;

      if (bands[1]) bands[1].style.display = hasA || hasB || layoutTriple ? "" : "none";
      if (bands[2]) bands[2].style.display = layoutTriple ? "" : "none";
      wrap.dataset.thirdActive = layoutTriple ? "1" : thirdActive ? "1" : "0";
      syncActionButtons();

      if (values.every((v) => !v)) {
        clearCellCourseSlots(wrap);
        cell.classList.add("cell--blank", "cell--solo-center");
        wrap.classList.add("cell--blank", "cell--solo-center");
        return;
      }

      const parsed = values.map((v) => (v ? parseBandToken(v) : null));
      const fmtBadIndex = parsed.findIndex((n, i) => values[i] && (n === null || (typeof n === "number" && Number.isNaN(n))));
      if (fmtBadIndex >= 0) {
        const courses = parsed.map((n) => (Number.isFinite(n) ? byIndex(n) : null));
        showError(describeAllBands(parsed, courses));
        return;
      }

      const uniq = new Set();
      for (const n of parsed) {
        if (!Number.isFinite(n)) continue;
        if (uniq.has(n)) {
          showError("（同一格内三个序号不能重复）");
          appendComplianceEvent("grid_input_error", { cellId: id, reason: "duplicate_in_cell", duplicateIndex: n });
          return;
        }
        uniq.add(n);
      }

      const { dayKey, slotKey } = parseCellId(id);
      const courses = parsed.map((n) => (Number.isFinite(n) ? byIndex(n) : null));
      const occupied = values.map((v, i) => Boolean(v && courses[i]));
      if (values.some((v, i) => v && !courses[i])) {
        showError(describeAllBands(parsed, courses));
        return;
      }

      stacks.forEach((stack) => clearStackSlots(stack));
      bands.forEach((bandEl, i) => {
        if (!bandEl) return;
        if (values[i]) bandEl.classList.remove("cell-band--empty");
        else bandEl.classList.add("cell-band--empty");
      });

      let layoutClass = "cell--solo-center";
      if (layoutTriple) layoutClass = "cell--triple";
      else if (hasA && !hasB) layoutClass = "cell--solo-bottom";
      else if (hasA || hasB) layoutClass = "cell--dual";

      cell.classList.add("cell--filled", layoutClass);
      wrap.classList.add("cell--filled", layoutClass);

      if (splits[0]) splits[0].hidden = !(hasA && hasB);
      if (splits[1]) splits[1].hidden = !(layoutTriple && hasB && hasC);

      occupied.forEach((ok, i) => {
        if (!ok) return;
        if (!layoutTriple && i === 2) return;
        if (i === 1 && !(hasA || hasB || layoutTriple)) return;
        fillCourseStack(stacks[i], courses[i], dayKey, slotKey);
      });

      if (hasC) {
        wrap.removeAttribute("data-third-pending");
      }
      syncActionButtons();
    }

    function refreshAllResolved() {
      const ids = Array.from(document.querySelectorAll(".cell[data-cell]"))
        .map((el) => el.dataset.cell)
        .filter(Boolean);
      let i = 0;
      const CHUNK = 12;
      function step() {
        const end = Math.min(i + CHUNK, ids.length);
        for (; i < end; i++) updateCellDisplay(ids[i]);
        if (i < ids.length) {
          requestAnimationFrame(step);
        } else {
          syncOverflowTripleSameSlotUi();
        }
      }
      if (!ids.length) syncOverflowTripleSameSlotUi();
      else requestAnimationFrame(step);
    }

    function gridState() {
      const o = Object.create(null);
      document.querySelectorAll(".cell[data-cell]").forEach((cell) => {
        const id = cell.dataset.cell;
        const a = cell.querySelector('input.idx-band[data-band="0"]')?.value.trim() ?? "";
        const b = cell.querySelector('input.idx-band[data-band="1"]')?.value.trim() ?? "";
        const c = cell.querySelector('input.idx-band[data-band="2"]')?.value.trim() ?? "";
        const j = joinBands(a, b, c);
        if (j) o[id] = j;
      });
      return o;
    }

    let gridRestoredFromBackup = false;

    function loadGrid() {
      const empty = {};
      const tryParseObject = (raw) => {
        const o = CourseTable.utils.safeJsonParse(raw, null);
        return o && typeof o === "object" && !Array.isArray(o) ? o : null;
      };
      try {
        const p = tryParseObject(localStorage.getItem(LS_KEY));
        if (p) return p;
      } catch (_e) {
        /* ignore */
      }
      try {
        const b = tryParseObject(localStorage.getItem(LS_KEY_GRID_BAK));
        if (b) {
          gridRestoredFromBackup = true;
          return b;
        }
      } catch (_e) {
        /* ignore */
      }
      return empty;
    }

    let gridModel;

    function writeGridStorage(obj) {
      const next = obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
      const s = JSON.stringify(next);
      try {
        localStorage.setItem(LS_KEY, s);
        localStorage.setItem(LS_KEY_GRID_BAK, s);
      } catch (_e) {
        /* ignore */
      }
      gridModel = Object.assign(Object.create(null), next);
      return gridModel;
    }

    gridModel = Object.assign(Object.create(null), loadGrid());

    function captureAppState() {
      return {
        enrollData: cloneEnroll(enrollData),
        grid: gridState(),
        sheetRenderLang,
        uiLangPref: getLangPref(),
        slotParams: loadSlotParams(),
        slotTimes: loadSlotTimesMap(),
        lastImportFileName: lastEnrollImportMeta.fileName || "",
        lastImportTime: lastEnrollImportMeta.importedAt || ""
      };
    }

    function trimHistoryStack(stack) {
      while (stack.length > APP_HISTORY_MAX) stack.shift();
    }

    function updateUndoButtonState() {
      const btnUndo = document.getElementById("btn-undo");
      const btnRedo = document.getElementById("btn-redo");
      if (btnUndo) btnUndo.disabled = undoStack.length === 0;
      if (btnRedo) btnRedo.disabled = redoStack.length === 0;
    }

    function commitAppStateSnapshotNow() {
      if (isApplyingAppState) return;
      const snap = captureAppState();
      const prev = undoStack.length ? undoStack[undoStack.length - 1] : null;
      if (prev && JSON.stringify(prev) === JSON.stringify(snap)) return;
      undoStack.push(snap);
      trimHistoryStack(undoStack);
      redoStack = [];
      updateUndoButtonState();
    }

    function scheduleAppStateCommit() {
      if (isApplyingAppState) return;
      if (appStateCommitTimer) clearTimeout(appStateCommitTimer);
      appStateCommitTimer = window.setTimeout(() => {
        appStateCommitTimer = null;
        commitAppStateSnapshotNow();
      }, APP_STATE_COMMIT_DEBOUNCE_MS);
    }

    function applyAppState(snapshot) {
      if (!snapshot || typeof snapshot !== "object") return;
      isApplyingAppState = true;
      try {
        enrollData = cloneEnroll(snapshot.enrollData || ENROLL_DEFAULT);
        normalizeEnrollShape(enrollData, { restoredFromStorage: true });
        lastEnrollRenderKey = "";
        lastEnrollImportMeta = {
          fileName: snapshot.lastImportFileName || "",
          importedAt: snapshot.lastImportTime || ""
        };
        sheetRenderLang = snapshot.sheetRenderLang != null ? snapshot.sheetRenderLang : null;
        setLangPref(snapshot.uiLangPref || "");
        try {
          writeGridStorage(snapshot.grid || {});
        } catch (_e) {
          /* ignore */
        }
        try {
          saveSlotParams(snapshot.slotParams || loadSlotParams());
        } catch (_e) {
          /* ignore */
        }
        saveEnrollToStorage(enrollData, true);
        syncLangRadios();
        applySidebarI18n();
        applySlotParamsToInputs();
        renderEnroll();
        renderGrid();
        refreshAllResolved();
        applySheetStaticI18n();
        applyTotalsLabels();
        setMetaSourceFromEnroll();
        scheduleA3PreviewScale();
      } finally {
        isApplyingAppState = false;
        updateUndoButtonState();
      }
    }

    function undoGrid() {
      if (!undoStack.length) return;
      const current = captureAppState();
      const snap = undoStack.pop();
      redoStack.push(current);
      trimHistoryStack(redoStack);
      applyAppState(snap);
      appendComplianceEvent("undo_grid");
      updateStatusLastAction(getEffectiveUiLang() === "en" ? "Undo completed." : "已撤销上一步操作。");
      updateUndoButtonState();
    }

    function redoGrid() {
      if (!redoStack.length) return;
      const current = captureAppState();
      const snap = redoStack.pop();
      undoStack.push(current);
      trimHistoryStack(undoStack);
      applyAppState(snap);
      updateStatusLastAction(getEffectiveUiLang() === "en" ? "Redo completed." : "已重做上一步操作。");
      updateUndoButtonState();
    }

    function enrollCourseCountN() {
      return Math.max(0, enrollData.courses.length);
    }

    /** 序号提示：N 为当前选课表课程门数（与需求「1～N」一致） */
    function messageForInvalidIndex(n) {
      const N = enrollCourseCountN();
      const capN = Math.max(1, N);
      if (!Number.isFinite(n)) return "（序号格式有误）";
      if (n < 1 || n > capN) return `（序号应在 1～${capN} 之间）`;
      if (!byIndex(n)) return `（无此序号，可选序号范围：1～${capN}）`;
      return "";
    }

    function removePrintChecklist() {
      document.getElementById("print-checklist")?.remove();
    }

    function injectPrintChecklist(result) {
      removePrintChecklist();
      const block = document.querySelector(".schedule-block");
      if (!block) return;
      const foot = block.querySelector("footer.note");
      const div = document.createElement("div");
      div.id = "print-checklist";
      const r = result || {};
      const invalidRefs = r.invalidRefs || [];
      const unassignedCourses = r.unassignedCourses || [];
      const tripleList = r.tripleSameSlots || [];
      const oc = r.onlineCheck || { totalOnline: 0, missingOnline: 0, placedOnline: 0 };
      const fuzzyN = r.fuzzyCategories != null ? r.fuzzyCategories : 0;
      const overflowN = r.overflowCells != null ? r.overflowCells : 0;

      let html = "<h3>选课与课表对照检查</h3>";
      if (oc.totalOnline > 0) {
        if (oc.missingOnline === oc.totalOnline) {
          html += `<p><strong>网课：</strong>检测到 ${oc.totalOnline} 门网课未安排在周课表中（网课无需排课），已自动确认。</p>`;
        } else {
          html += `<p><strong>网课：</strong>警告：${oc.totalOnline} 门网课中，有 ${oc.placedOnline} 门被排入了周课表。请手动核对是否误排。</p>`;
        }
      }
      if (fuzzyN > 0) {
        html += `<p><strong>课程类别：</strong>检测到 ${fuzzyN} 门课程的类别信息不完整或模糊（如「选修」无法区分是否属于专业选修）。请在打印前手动核对。</p>`;
      }
      if (overflowN > 0) {
        html += `<p><strong>三课同格：</strong>发现 ${overflowN} 个时间格存在三课及以上情况，请手动核对。</p>`;
      }
      if (tripleList.length) {
        html += "<p><strong>三课及以上同格明细（选课表「上课时间」解析后重叠，第三门起未自动填入）：</strong></p>";
        tripleList.forEach((item) => {
          html += `<p>·「${escapeHtml(item.positionLabel)}」</p><ul>`;
          item.courses.forEach((c) => {
            const sn = c.序号 != null ? String(c.序号) : "";
            const name = c.课程名称 != null ? String(c.课程名称) : "";
            html += `<li>序号 ${escapeHtml(sn)}：${escapeHtml(name)}</li>`;
          });
          html += "</ul>";
        });
      }
      if (invalidRefs.length) {
        html += "<p><strong>课表中无效或无法对照的序号：</strong></p><ul>";
        invalidRefs.forEach((ref) => {
          html += `<li>格子「${escapeHtml(ref.id)}」${escapeHtml(ref.label)}：「${escapeHtml(String(ref.value))}」</li>`;
        });
        html += "</ul>";
      }
      if (unassignedCourses.length) {
        html += "<p><strong>尚未填入周课表至少一次的课程：</strong></p><ul>";
        unassignedCourses.forEach((c) => {
          const sn = c.序号 != null ? String(c.序号) : "";
          const name = c.课程名称 != null ? String(c.课程名称) : "";
          html += `<li>序号 ${escapeHtml(sn)}：${escapeHtml(name)}</li>`;
        });
        html += "</ul>";
      }
      div.innerHTML = html;
      if (foot) block.insertBefore(div, foot);
      else block.appendChild(div);
    }

    function checkScheduleConsistency() {
      const state = gridState();
      const invalidRefs = [];
      const used = new Set();
      const capN = Math.max(1, enrollData.courses.length);
      for (const id of Object.keys(state)) {
        const [va, vb, vc] = splitCellBands(state[id]);
        for (const { val, label } of [
          { val: va, label: "上栏" },
          { val: vb, label: "下栏" },
          { val: vc, label: "第三栏" }
        ]) {
          if (!val) continue;
          const n = parseBandToken(val);
          if (n === null || Number.isNaN(n)) {
            invalidRefs.push({ id, label, value: val });
            continue;
          }
          if (n < 1 || n > capN || !byIndex(n)) {
            invalidRefs.push({ id, label, value: val });
            continue;
          }
          used.add(n);
        }
      }
      const unassignedCourses = enrollData.courses.filter((c) => {
        if (c.网课) return false;
        const sn = parseInt(String(c.序号), 10);
        return Number.isFinite(sn) && sn >= 1 && !used.has(sn);
      });
      const tripleSameSlots = collectTripleSameSlotIssues();
      const onlineCourses = enrollData.courses.filter((c) => c.网课);
      const totalOnline = onlineCourses.length;
      let placedOnline = 0;
      onlineCourses.forEach((c) => {
        const sn = parseInt(String(c.序号), 10);
        if (Number.isFinite(sn) && sn >= 1 && used.has(sn)) placedOnline++;
      });
      const missingOnline = totalOnline - placedOnline;
      const onlineCheck = { totalOnline, missingOnline, placedOnline };
      const fuzzyCategories = enrollData.courses.reduce(
        (n, c) => n + (courseCategoryIsFuzzy(c.课程类别) ? 1 : 0),
        0
      );
      const overflowCells = tripleSameSlots.length;
      const adv = runAdvancedExportChecks();
      return {
        invalidRefs,
        unassignedCourses,
        tripleSameSlots,
        onlineCheck,
        fuzzyCategories,
        overflowCells,
        teacherConflicts: adv.teacherConflicts,
        roomConflicts: adv.roomConflicts,
        asyncSplitWarnings: adv.asyncSplitWarnings
      };
    }

    /** 同一教师、同一周课格子内解析出多门不同课程 → 时间冲突 */
    function courseOccupiedCells(course) {
      const keys = new Set();
      for (const p of parseCourseToSchedulePlacements(course)) {
        keys.add(`${p.dayKey}-${p.slotKey}`);
      }
      return keys;
    }

    function runAdvancedExportChecks() {
      const teacherConflicts = [];
      const nonOnline = enrollData.courses.filter((c) => !c.网课);
      const byTeacher = new Map();
      for (const c of nonOnline) {
        const tch = String(c.任课教师 != null ? c.任课教师 : "").trim();
        if (!tch) continue;
        if (!byTeacher.has(tch)) byTeacher.set(tch, []);
        byTeacher.get(tch).push(c);
      }
      const seenPair = new Set();
      for (const arr of byTeacher.values()) {
        if (arr.length < 2) continue;
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const a = arr[i];
            const b = arr[j];
            if (String(a.序号) === String(b.序号)) continue;
            const pk = [String(a.序号), String(b.序号)].sort().join("|");
            if (seenPair.has(pk)) continue;
            const ka = courseOccupiedCells(a);
            const kb = courseOccupiedCells(b);
            let hit = false;
            for (const k of ka) {
              if (kb.has(k)) {
                hit = true;
                break;
              }
            }
            if (hit) {
              seenPair.add(pk);
              teacherConflicts.push({ teacher: String(a.任课教师).trim(), a, b });
            }
          }
        }
      }
      const roomConflicts = [];
      const bucket = new Map();
      for (const c of nonOnline) {
        const merged = normalizeCourseScheduleForAutofill(c.上课时间 || "");
        const timeParts = merged.split(/[;；]/).map((x) => x.trim()).filter(Boolean);
        const placeParts = String(c.上课地点 != null ? c.上课地点 : "")
          .split(/[;；]/)
          .map((x) => x.trim());
        timeParts.forEach((part, idx) => {
          const rawPl =
            placeParts[idx] != null && placeParts[idx] !== "" ? placeParts[idx] : placeParts[0] || "";
          const place = String(rawPl).trim();
          if (!place) return;
          const placeKey = place.toLowerCase();
          for (const pt of parseOneScheduleSegment(part)) {
            const slotKey = `${pt.dayKey}-${pt.slotKey}@@${placeKey}`;
            if (!bucket.has(slotKey)) bucket.set(slotKey, []);
            bucket.get(slotKey).push({ seq: c.序号, name: c.课程名称, section: c.教学班号 });
          }
        });
      }
      for (const list of bucket.values()) {
        const uniq = new Map();
        for (const it of list) uniq.set(String(it.seq), it);
        if (uniq.size > 1) roomConflicts.push([...uniq.values()]);
      }
      const asyncSplitWarnings = [];
      for (const c of nonOnline) {
        const merged = normalizeCourseScheduleForAutofill(c.上课时间 || "");
        const timeParts = merged.split(/[;；]/).map((x) => x.trim()).filter(Boolean);
        const placeParts = String(c.上课地点 != null ? c.上课地点 : "")
          .split(/[;；]/)
          .map((x) => x.trim())
          .filter(Boolean);
        if (timeParts.length > 1 && placeParts.length === timeParts.length && placeParts.length > 1) {
          asyncSplitWarnings.push(c);
        }
      }
      return { teacherConflicts, roomConflicts, asyncSplitWarnings };
    }

    function biCheckLine(zh, en) {
      return (
        `<div class="check-bi"><div>${escapeHtml(zh)}</div><div style="font-size:0.78em;color:#555">${escapeHtml(en)}</div></div>`
      );
    }

    function buildExportCheckModalHtml(r) {
      const Z = I18N.zh;
      const E = I18N.en;
      const parts = [];
      const invN = r.invalidRefs.length;
      const unass = r.unassignedCourses.length;
      const overflowN = r.overflowCells;
      const fuzzyN = r.fuzzyCategories;
      const oc = r.onlineCheck;
      const tc = r.teacherConflicts || [];
      const rc = r.roomConflicts || [];
      const asy = r.asyncSplitWarnings || [];

      if (invN > 0) {
        parts.push(
          biCheckLine(
            `无效序号：${invN} 处（请见打印清单）。`,
            `Invalid index entries: ${invN} (see print checklist).`
          )
        );
      }
      if (unass > 0) {
        parts.push(
          biCheckLine(
            `未排课：${unass} 门非网课未出现在周课表任意格子。`,
            `Unassigned: ${unass} non-online course(s) never appear on the weekly grid.`
          )
        );
      }
      if (oc.totalOnline > 0 && oc.placedOnline > 0) {
        parts.push(
          biCheckLine(
            `网课误排：${oc.placedOnline} 门网课被填入周课表。`,
            `Online courses on grid: ${oc.placedOnline} online course(s) appear in weekly cells.`
          )
        );
      }
      if (overflowN > 0) {
        parts.push(
          biCheckLine(`三课同格：${overflowN} 个格子。`, `Three+ courses same cell: ${overflowN} cell(s).`)
        );
      }
      if (fuzzyN > 0) {
        parts.push(
          biCheckLine(`课程类别模糊：${fuzzyN} 门。`, `Ambiguous category: ${fuzzyN} course(s).`)
        );
      }
      tc.forEach((row) => {
        const an = row.a.课程名称 != null ? String(row.a.课程名称) : "";
        const bn = row.b.课程名称 != null ? String(row.b.课程名称) : "";
        parts.push(
          biCheckLine(
            `教师「${row.teacher}」在同一时段解析出多门课：序号 ${row.a.序号}「${an}」与序号 ${row.b.序号}「${bn}」。`,
            `Instructor "${row.teacher}" has overlapping parsed slots: #${row.a.序号} "${an}" vs #${row.b.序号} "${bn}".`
          )
        );
      });
      rc.forEach((list) => {
        const names = list.map((x) => `#${x.seq} ${x.name != null ? String(x.name) : ""}`).join("；");
        parts.push(
          biCheckLine(`同一教室、同一时段多门课：${names}`, `Same room & slot, multiple courses: ${names}`)
        );
      });
      asy.forEach((c) => {
        const n = c.课程名称 != null ? String(c.课程名称) : "";
        parts.push(
          biCheckLine(
            `「${n}」上课地点分段数与上课时间段数一致，可能含理论/实验，请在周课表手动拆分展示。`,
            `"${n}" has matching venue segments and time segments — may need manual split for lecture/lab.`
          )
        );
      });
      if (!parts.length) {
        parts.push(biCheckLine(Z.noIssues, E.noIssues));
      }
      parts.push(
        biCheckLine(
          "导出即确认：本文件为排版对照件，非学校正式文件。本人对所有填写内容承担全部责任。",
          "By exporting you confirm this is an unofficial layout, not an institutional document. You accept full responsibility for all content."
        )
      );
      return parts.join("");
    }

    function exportCheckNeedConfirm(r) {
      const oc = r.onlineCheck;
      return (
        r.invalidRefs.length > 0 ||
        r.unassignedCourses.length > 0 ||
        r.overflowCells > 0 ||
        r.fuzzyCategories > 0 ||
        oc.totalOnline > 0 ||
        (r.teacherConflicts && r.teacherConflicts.length > 0) ||
        (r.roomConflicts && r.roomConflicts.length > 0) ||
        (r.asyncSplitWarnings && r.asyncSplitWarnings.length > 0)
      );
    }

    let exportModalContinue = null;
    let currentExportPhrase = "";
    let currentExportPhraseHash = "";

    function exportPhrasePoolForUiLang() {
      return getEffectiveUiLang() === "en" ? EXPORT_PHRASE_POOL_EN : EXPORT_PHRASE_POOL_ZH;
    }

    function pickRandomExportPhrase() {
      const pool = exportPhrasePoolForUiLang();
      if (!Array.isArray(pool) || !pool.length) return "";
      return pool[Math.floor(Math.random() * pool.length)] || pool[0] || "";
    }

    function getExpectedExportPhrase() {
      return currentExportPhrase || "";
    }

    /** 模态 body 末尾追加的责任确认短语区域（文案由 openExportCheckModal 写入） */
    function buildExportPhraseBlockHtml() {
      return (
        `<div class="export-phrase-block" id="export-phrase-block">` +
        `<p class="export-phrase-hint" id="export-phrase-hint"></p>` +
        `<input type="text" class="export-phrase-input" id="export-phrase-input" autocomplete="off" spellcheck="false" aria-required="true" />` +
        `<p class="export-phrase-err" id="export-phrase-err" role="alert" hidden></p>` +
        `</div>`
      );
    }

    function syncExportPhraseOkState() {
      const inp = document.getElementById("export-phrase-input");
      const ok = document.getElementById("export-check-ok");
      const err = document.getElementById("export-phrase-err");
      if (!inp || !ok) return;
      const expected = getExpectedExportPhrase();
      const match = inp.value.trim() === expected;
      ok.disabled = !match;
      if (err && match) {
        err.hidden = true;
        err.textContent = "";
      }
    }

    function showExportPhraseMismatch() {
      const err = document.getElementById("export-phrase-err");
      const L = I18N[getEffectiveUiLang()] || I18N.zh;
      if (!err) return;
      err.textContent = L.exportPhraseMismatch;
      err.hidden = false;
    }

    function closeExportCheckModal() {
      const m = document.getElementById("export-check-modal");
      if (m) m.hidden = true;
      exportModalContinue = null;
      currentExportPhrase = "";
      currentExportPhraseHash = "";
      const inp = document.getElementById("export-phrase-input");
      if (inp) inp.value = "";
      const err = document.getElementById("export-phrase-err");
      if (err) {
        err.textContent = "";
        err.hidden = true;
      }
      const ok = document.getElementById("export-check-ok");
      if (ok) ok.disabled = true;
    }

    function openServiceConsentModal() {
      const modal = document.getElementById("service-consent-modal");
      const input = document.getElementById("service-consent-name-input");
      const err = document.getElementById("service-consent-error");
      if (!modal || !input || !err) return;
      input.value = "";
      err.textContent = "";
      err.hidden = true;
      modal.hidden = false;
      window.setTimeout(() => input.focus(), 30);
    }

    function closeServiceConsentModal() {
      const modal = document.getElementById("service-consent-modal");
      const input = document.getElementById("service-consent-name-input");
      const err = document.getElementById("service-consent-error");
      if (modal) modal.hidden = true;
      if (input) input.value = "";
      if (err) {
        err.textContent = "";
        err.hidden = true;
      }
    }

    async function submitServiceConsentName() {
      const input = document.getElementById("service-consent-name-input");
      const err = document.getElementById("service-consent-error");
      if (!(input instanceof HTMLInputElement) || !err) return;
      const fullName = input.value.trim();
      if (!fullName) {
        err.textContent = "请输入姓名全称后再继续。";
        err.hidden = false;
        input.focus();
        return;
      }
      try {
        const nameHash = await sha256HexUtf8(fullName);
        sessionStorage.setItem(SESSION_KEY_SERVICE_CONSENT_NAME_HASH, nameHash);
        closeServiceConsentModal();
      } catch (_e) {
        err.textContent = "当前浏览器无法完成姓名哈希，请稍后重试。";
        err.hidden = false;
      }
    }

    function bindServiceConsentModalOnce() {
      const modal = document.getElementById("service-consent-modal");
      const ok = document.getElementById("service-consent-ok");
      const input = document.getElementById("service-consent-name-input");
      if (!modal || !ok || ok.dataset.serviceConsentBound) return;
      ok.dataset.serviceConsentBound = "1";
      ok.addEventListener("click", () => {
        void submitServiceConsentName();
      });
      if (input instanceof HTMLInputElement) {
        input.addEventListener("keydown", (ev) => {
          if (ev.key !== "Enter") return;
          ev.preventDefault();
          void submitServiceConsentName();
        });
      }
    }

    const SESSION_KEY_CONSENT_BANNER_DISMISSED = "courseConsentBannerDismissed";
    let serviceConsentBannerTimer = null;

    function hideServiceConsentBanner(withMotion) {
      const banner = document.getElementById("service-consent-banner");
      if (serviceConsentBannerTimer) {
        clearTimeout(serviceConsentBannerTimer);
        serviceConsentBannerTimer = null;
      }
      if (!banner) return;
      if (!withMotion) {
        banner.hidden = true;
        banner.classList.remove("is-hiding");
        return;
      }
      banner.classList.add("is-hiding");
      window.setTimeout(() => {
        banner.hidden = true;
        banner.classList.remove("is-hiding");
      }, 190);
    }

    function showServiceConsentBannerIfNeeded() {
      const banner = document.getElementById("service-consent-banner");
      if (!banner) return;
      let dismissed = false;
      try {
        dismissed = sessionStorage.getItem(SESSION_KEY_CONSENT_BANNER_DISMISSED) === "1";
      } catch (_e) {
        dismissed = false;
      }
      if (dismissed) {
        banner.hidden = true;
        banner.classList.remove("is-hiding");
        return;
      }
      banner.hidden = false;
      banner.classList.remove("is-hiding");
      if (serviceConsentBannerTimer) clearTimeout(serviceConsentBannerTimer);
      serviceConsentBannerTimer = window.setTimeout(() => {
        hideServiceConsentBanner(true);
      }, 8000);
    }

    function bindServiceConsentBannerOnce() {
      const btn = document.getElementById("service-consent-banner-btn");
      if (!btn || btn.dataset.bannerBound) return;
      btn.dataset.bannerBound = "1";
      btn.addEventListener("click", () => {
        try {
          sessionStorage.setItem(SESSION_KEY_CONSENT_BANNER_DISMISSED, "1");
        } catch (_e) {
          /* ignore */
        }
        hideServiceConsentBanner(true);
      });
    }

    function ensureServiceConsentForSession() {
      try {
        const savedHash = sessionStorage.getItem(SESSION_KEY_SERVICE_CONSENT_NAME_HASH);
        if (savedHash) return;
      } catch (_e) {
        /* ignore */
      }
      openServiceConsentModal();
    }

    function saveCurrentSessionData() {
      flushEnrollSaveNow();
      saveSlotParams(readSlotParamsFromInputs());
      flushPersistGridNow();
    }

    function clearUserDataForFreshSession() {
      const lang = getEffectiveUiLang();
      enrollData = lang === "en" ? cloneEnroll(ENROLL_SAMPLE_EN) : cloneEnroll(ENROLL_DEFAULT);
      normalizeEnrollShape(enrollData, { restoredFromStorage: true });
      lastEnrollImportMeta = { fileName: "", importedAt: "" };
      undoStack = [];
      redoStack = [];
      userManuallySaved = false;
      try {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(LS_KEY_GRID_BAK);
        localStorage.removeItem(LS_KEY_ENROLL);
        localStorage.removeItem(LS_KEY_ENROLL_ZH);
        localStorage.removeItem(LS_KEY_ENROLL_EN);
        localStorage.removeItem(LS_KEY_ENROLL_ZH + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_ENROLL_EN + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_ENROLL + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_SLOT_TIMES);
        localStorage.removeItem(LS_KEY_SLOT_PARAMS);
        localStorage.removeItem(LS_KEY_SLOT_PARAMS + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_EN_NAMES);
        localStorage.removeItem(LS_KEY_EN_NAMES_ZH);
        localStorage.removeItem(LS_KEY_EN_NAMES_EN);
        localStorage.removeItem(LS_KEY_EN_NAMES_ZH + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_EN_NAMES_EN + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_EN_NAMES + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_SHOW_EN_SUB);
        localStorage.removeItem(LS_KEY_ACTIVE_THIRD_BANDS);
      } catch (_e) {
        /* ignore */
      }
      gridModel = Object.assign(Object.create(null), loadGrid());
    }

    function initSessionPersistenceMode() {
      try {
        const hasSession = sessionStorage.getItem(SESSION_KEY_PAGE_SESSION_ACTIVE) === "1";
        const isRefresh = sessionStorage.getItem(SESSION_KEY_REFRESH_MARK) === "1";
        if (!hasSession && !isRefresh) {
          clearUserDataForFreshSession();
        }
        sessionStorage.setItem(SESSION_KEY_PAGE_SESSION_ACTIVE, "1");
        sessionStorage.removeItem(SESSION_KEY_REFRESH_MARK);
      } catch (_e) {
        clearUserDataForFreshSession();
      }
    }

    function manualSaveCurrentWork() {
      try {
        saveCurrentSessionData();
      } catch (_e) {
        /* ignore */
      }
      userManuallySaved = true;
      undoStack = [];
      redoStack = [];
      updateUndoButtonState();
      appendComplianceEvent("manual_save");
      updateStatusLastAction(getEffectiveUiLang() === "en" ? "Manual save completed." : "已手动保存当前数据。");
      flashSaveToast(1800);
    }

    function openExportCheckModal(r, onContinue) {
      const modal = document.getElementById("export-check-modal");
      const title = document.getElementById("export-check-modal-title");
      const body = document.getElementById("export-check-modal-body");
      if (!modal || !title || !body) {
        if (window.confirm("Continue export? / 继续导出？")) onContinue({ confirmedPhrase: "", phraseHash: "" });
        return;
      }
      const L = I18N[getEffectiveUiLang()] || I18N.zh;
      currentExportPhrase = pickRandomExportPhrase();
      currentExportPhraseHash = "";
      title.textContent = L.exportModalTitle;
      body.innerHTML = buildExportCheckModalHtml(r) + buildExportPhraseBlockHtml();
      const hint = document.getElementById("export-phrase-hint");
      const inp = document.getElementById("export-phrase-input");
      const phraseBlock = document.getElementById("export-phrase-block");
      if (hint) hint.textContent = L.exportPhraseHint;
      if (phraseBlock && currentExportPhrase) {
        phraseBlock.insertAdjacentHTML(
          "afterbegin",
          `<p class="export-phrase-expected" id="export-phrase-expected">${escapeHtml(currentExportPhrase)}</p>`
        );
      }
      if (inp) {
        inp.placeholder = L.exportPhrasePlaceholder;
        inp.value = "";
        inp.removeAttribute("disabled");
      }
      const err = document.getElementById("export-phrase-err");
      if (err) {
        err.textContent = "";
        err.hidden = true;
      }
      const ok = document.getElementById("export-check-ok");
      if (ok) ok.disabled = true;
      syncExportPhraseOkState();
      exportModalContinue = onContinue;
      modal.hidden = false;
      void (async () => {
        try {
          currentExportPhraseHash = currentExportPhrase ? await sha256HexUtf8(currentExportPhrase) : "";
        } catch (_e) {
          currentExportPhraseHash = "";
        }
      })();
      window.setTimeout(() => inp?.focus(), 30);
    }

    function bindExportCheckModalOnce() {
      const ok = document.getElementById("export-check-ok");
      const cxl = document.getElementById("export-check-cancel");
      const modal = document.getElementById("export-check-modal");
      const bd = document.getElementById("export-check-modal-backdrop");
      if (!ok || ok.dataset.exportModalBound) return;
      ok.dataset.exportModalBound = "1";
      ok.addEventListener("mousedown", (e) => {
        if (ok.disabled) {
          e.preventDefault();
          showExportPhraseMismatch();
        }
      });
      ok.addEventListener("click", () => {
        const inp = document.getElementById("export-phrase-input");
        if (!inp || inp.value.trim() !== getExpectedExportPhrase()) {
          showExportPhraseMismatch();
          return;
        }
        const phrase = inp.value.trim();
        const phraseHash = currentExportPhraseHash;
        const fn = exportModalContinue;
        closeExportCheckModal();
        if (typeof fn === "function") fn({ confirmedPhrase: phrase, phraseHash });
      });
      cxl?.addEventListener("click", closeExportCheckModal);
      bd?.addEventListener("click", closeExportCheckModal);
      if (modal && !modal.dataset.exportPhraseDelegated) {
        modal.dataset.exportPhraseDelegated = "1";
        modal.addEventListener(
          "input",
          (ev) => {
            const t = ev.target;
            if (t instanceof HTMLInputElement && t.id === "export-phrase-input") {
              syncExportPhraseOkState();
            }
          },
          true
        );
        modal.addEventListener(
          "keydown",
          (ev) => {
            const t = ev.target;
            if (!(t instanceof HTMLInputElement) || t.id !== "export-phrase-input") return;
            if (ev.key !== "Enter") return;
            ev.preventDefault();
            if (t.value.trim() !== getExpectedExportPhrase()) {
              showExportPhraseMismatch();
              return;
            }
            if (!ok.disabled) ok.click();
          },
          true
        );
      }
    }

    function isPageTranslated() {
      const cl = document.documentElement && document.documentElement.classList;
      if (cl && (cl.contains("translated-ltr") || cl.contains("translated-rtl"))) return true;
      // Google Translate 会在 body 内插入 <font> 标签
      if (document.body && document.body.querySelector("font[_mstmutation], font[class*='notranslate']")) return true;
      // 检查 html 元素的 lang 属性是否被翻译器修改（如从 zh-CN 变为 en）
      const htmlLang = document.documentElement.getAttribute("lang") || "";
      const metaLang = document.querySelector("meta[http-equiv='Content-Language']");
      if (metaLang && metaLang.getAttribute("content") && htmlLang && htmlLang !== (document.documentElement.getAttribute("data-original-lang") || htmlLang)) return true;
      return false;
    }

    function warnAndBlockForTranslation() {
      const L = I18N[getEffectiveUiLang()] || I18N.zh;
      const line1 = getEffectiveUiLang() === "en"
        ? "Translation detected — export unavailable."
        : "检测到翻译功能已开启，导出功能不可用";
      const line2 = getEffectiveUiLang() === "en"
        ? "Disable translation and refresh to enable export."
        : "关闭翻译功能，刷新页面后可启用";
      updateStatusLastError(`${line1}\n${line2}`);
      const ve = document.getElementById("status-value-error");
      if (ve) {
        ve.style.whiteSpace = "pre-line";
        ve.style.color = "#b45309";
        ve.classList.add("translation-warn-blink");
      }
    }

    function getCellDisplayLabel(id) {
      const parsed = parseCellId(id);
      if (!parsed) return id;
      const dayMap = { mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日" };
      const slotMap = { p12: "第1-2节", p34: "第3-4节", p56: "第5-6节", p78: "第7-8节", p910: "第9-10节", p1112: "第11-12节" };
      return `${dayMap[parsed.dayKey] || parsed.dayKey}${slotMap[parsed.slotKey] || parsed.slotKey}`;
    }

    /* 导出前先处理已激活但未填写的第三栏，避免用户无感带入导出。 */
    function resolveEmptyThirdBandsBeforeExport(onDone) {
      const pending = Array.from(activeThirdBandCellIds).filter((id) => {
        const cell = document.querySelector(`.cell[data-cell="${id}"]`);
        const band2 = cell ? cell.querySelector('input.idx-band[data-band="2"]') : null;
        return band2 instanceof HTMLInputElement && !band2.value.trim();
      });
      if (!pending.length) {
        if (typeof onDone === "function") onDone(true);
        return;
      }
      const id = pending[0];
      const cell = document.querySelector(`.cell[data-cell="${id}"]`);
      const wrap = cell ? cell.querySelector(`[data-display="${id}"]`) : null;
      if (!cell || !wrap) {
        activeThirdBandCellIds.delete(id);
        saveStoredActiveThirdBands(activeThirdBandCellIds);
        resolveEmptyThirdBandsBeforeExport(onDone);
        return;
      }
      const ok = window.confirm(`你激活了同期同时段第三类课程的填写功能，数据未填写。位置：${getCellDisplayLabel(id)}。是否忽略该项目？`);
      if (ok) {
        const removeBtn = wrap.querySelector('button[data-action="remove-band"]');
        if (removeBtn instanceof HTMLButtonElement) removeBtn.click();
        resolveEmptyThirdBandsBeforeExport(onDone);
        return;
      }
      wrap.dataset.thirdPending = "1";
      if (typeof onDone === "function") onDone(false);
    }

    function runPrintWithCheck() {
      resolveEmptyThirdBandsBeforeExport((ready) => {
        if (!ready) return;
        const r = checkScheduleConsistency();
        const needConfirm = exportCheckNeedConfirm(r);
        openExportCheckModal(r, (meta) => {
          void (async () => {
            const phrase = meta && meta.confirmedPhrase != null ? String(meta.confirmedPhrase) : "";
            const phraseHash = meta && meta.phraseHash != null ? String(meta.phraseHash) : "";
            if (phrase) {
              try {
                appendComplianceEvent("export_phrase_confirmed", { phraseHash });
              } catch (_e) {
                /* compliance log unavailable */
              }
            }
            if (needConfirm) injectPrintChecklist(r);
            appendComplianceEvent("export_executed", { format: "print", phraseHash });
            const sheet = document.querySelector(".a3-sheet");
            const watermarkLang = getRenderLang() === "en" ? "en" : "zh";
            if (sheet instanceof HTMLElement) sheet.dataset.watermarkLang = watermarkLang;
            const onAfterPrint = () => {
              removePrintChecklist();
              if (sheet instanceof HTMLElement) delete sheet.dataset.watermarkLang;
              window.removeEventListener("afterprint", onAfterPrint);
            };
            window.addEventListener("afterprint", onAfterPrint);
            window.print();
          })();
        });
      });
    }

    function injectWatermarkOnCanvasClone(_clonedDoc, clonedSheet, lang) {
      const doc = clonedSheet.ownerDocument;
      if (!doc) return;
      const wrap = doc.createElement("div");
      wrap.setAttribute(
        "style",
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:9999;"
      );
      const inner = doc.createElement("div");
      inner.textContent = lang === "en"
        ? "UNOFFICIAL LAYOUT AID – NOT AN INSTITUTIONAL DOCUMENT"
        : "非官方排版对照件 – 非机构签发文件";
      inner.setAttribute(
        "style",
        "font-size:42px;font-weight:800;color:rgba(0,0,0,0.12);transform:rotate(-20deg);white-space:nowrap;user-select:none;-webkit-user-select:none;"
      );
      wrap.appendChild(inner);
      clonedSheet.appendChild(wrap);
    }

    async function captureSheetCanvas(lang) {
      const sheet = document.querySelector(".a3-sheet");
      if (!sheet) throw new Error("未找到 A3 版芯。");
      const captureLang = lang === "en" ? "en" : "zh";
      const scrollEl = sheet.querySelector(".table-scroll");
      const prev = { overflow: "", maxHeight: "", height: "" };
      const largeCourseCount = enrollData.courses.length > 30;
      if (scrollEl && largeCourseCount) {
        prev.overflow = scrollEl.style.overflow;
        prev.maxHeight = scrollEl.style.maxHeight;
        prev.height = scrollEl.style.height;
        scrollEl.style.overflow = "visible";
        scrollEl.style.maxHeight = "none";
        scrollEl.style.height = "auto";
      }
      await new Promise((res) => requestAnimationFrame(res));
      const canvas = await html2canvas(sheet, {
        scale: largeCourseCount ? 1.5 : 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone(clonedDoc) {
          const style = clonedDoc.createElement("style");
          style.textContent = ".idx-band, .cell-band-actions { display: none !important; }";
          clonedDoc.head?.appendChild(style);
          const cs = clonedDoc.querySelector(".a3-sheet");
          if (cs) injectWatermarkOnCanvasClone(clonedDoc, cs, captureLang);
        }
      });
      if (scrollEl && largeCourseCount) {
        scrollEl.style.overflow = prev.overflow;
        scrollEl.style.maxHeight = prev.maxHeight;
        scrollEl.style.height = prev.height;
      }
      return canvas;
    }

    function buildPackagePageHtml(title, bodyHtml, footerHtml, options) {
      const opts = options || {};
      const accent = opts.accent || "#1a3f6b";
      const subtitle = opts.subtitle ? `<p style="margin:10px 0 0;font-size:13px;letter-spacing:1.2px;color:#6b7280;">${escapeHtml(opts.subtitle)}</p>` : "";
      const topNote = opts.topNote ? `<div style="margin-bottom:18px;font-size:12px;color:#6b7280;letter-spacing:0.4px;">${escapeHtml(opts.topNote)}</div>` : "";
      return `
        <div style="width:794px;min-height:1123px;background:#fff;color:#1a1a1a;padding:54px 62px 58px;font-family:${getComputedStyle(document.documentElement).getPropertyValue("--font-ui") || "Segoe UI, sans-serif"};box-sizing:border-box;display:flex;flex-direction:column;">
          ${topNote}
          <div style="padding-bottom:18px;border-bottom:2px solid ${accent};">
            <h1 style="margin:0;font-size:30px;font-weight:800;color:${accent};letter-spacing:0.5px;">${escapeHtml(title)}</h1>
            ${subtitle}
          </div>
          <div style="margin-top:28px;font-size:16px;line-height:1.9;flex:1 1 auto;">${bodyHtml}</div>
          <div style="margin-top:54px;padding-top:18px;border-top:1px solid #d7dce3;font-size:15px;line-height:2.05;">${footerHtml}</div>
        </div>
      `;
    }

    async function captureDetachedHtmlCanvas(html, lang) {
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none;opacity:0;z-index:-1;";
      host.innerHTML = html;
      document.body.appendChild(host);
      try {
        const el = host.firstElementChild;
        if (!(el instanceof HTMLElement)) throw new Error("临时页面生成失败。");
        const captureLang = lang === "en" ? "en" : "zh";
        await new Promise((r) => requestAnimationFrame(r));
        return await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          onclone(clonedDoc) {
            const style = clonedDoc.createElement("style");
            style.textContent = ".idx-band, .cell-band-actions { display: none !important; }";
            clonedDoc.head?.appendChild(style);
            const page = clonedDoc.body && clonedDoc.body.firstElementChild;
            if (page instanceof HTMLElement) injectWatermarkOnCanvasClone(clonedDoc, page, captureLang);
          }
        });
      } finally {
        host.remove();
      }
    }

    async function exportBilingualSchedulePdf() {
      if (typeof html2canvas === "undefined") {
        showEnrollImportToast(
          getEffectiveUiLang() === "en"
            ? "html2canvas not loaded. Try browser Print → Save as PDF, or refresh when online."
            : "未加载 html2canvas。可改用浏览器「打印」→「另存为 PDF」，或在联网后刷新页面。"
        );
        return;
      }
      if (!window.jspdf || !window.jspdf.jsPDF) {
        showEnrollImportToast(
          getEffectiveUiLang() === "en"
            ? "jsPDF not loaded. Try browser Print → Save as PDF, or refresh when online."
            : "未加载 jsPDF。可改用浏览器「打印」→「另存为 PDF」，或在联网后刷新页面。"
        );
        return;
      }

      const first = enrollData.courses[0];
      const termMeta =
        first && first.学年 != null && first.学期 != null
          ? `${String(first.学年)} · ${formatSemesterLabel(first.学期, "en")}`
          : "";

      const prevSheetLang = sheetRenderLang;
      const prevPdfHide = pdfExportHideOnline;
      try {
        pdfExportHideOnline = true;
        sheetRenderLang = "zh";
        renderEnroll();
        renderGrid();
        refreshAllResolved();
        applySheetStaticI18n();
        setMetaSourceFromEnroll();
        scheduleA3PreviewScale();
        await CourseTable.utils.nextFrame();
        await CourseTable.utils.nextFrame();
        const c1 = await captureSheetCanvas("zh");

        sheetRenderLang = "en";
        renderEnroll();
        renderGrid();
        refreshAllResolved();
        applySheetStaticI18n();
        setMetaSourceFromEnroll();
        scheduleA3PreviewScale();
        await CourseTable.utils.nextFrame();
        await CourseTable.utils.nextFrame();
        const c2 = await captureSheetCanvas("en");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3", compress: true });
        let complianceLogHash = "";
        try {
          const complianceRaw = JSON.stringify(loadComplianceLog());
          complianceLogHash = complianceRaw ? await sha256HexUtf8(complianceRaw) : "";
        } catch (_e) {
          complianceLogHash = "";
        }
        pdf.setProperties({
          title: `Course Schedule – ${termMeta || "—"}`,
          subject: getComplianceLogHashSubjectText(complianceLogHash) || "Unofficial layout; NOT an institutional document",
          author: "Enrollment & Timetable Comparison X Formal",
          keywords: "course schedule, unofficial, bilingual"
        });
        const w = 297;
        const h = 420;
        pdf.addImage(c1.toDataURL("image/png"), "PNG", 0, 0, w, h, undefined, "FAST");
        await CourseTable.utils.nextFrame();
        pdf.addPage();
        await CourseTable.utils.nextFrame();
        pdf.addImage(c2.toDataURL("image/png"), "PNG", 0, 0, w, h, undefined, "FAST");
        const termNum = first ? parseInt(String(first.学期 != null ? first.学期 : "").trim(), 10) : NaN;
        const termPart = Number.isFinite(termNum) && termNum > 0 ? `Term${termNum}` : "Term";
        const yearPart = first && first.学年 != null ? String(first.学年).replace(/[^\w.-]+/g, "_") : "export";
        const dateStamp = formatYyyymmddLocal(new Date());
        const fname = `schedule_bilingual_${yearPart}_${termPart}_${dateStamp}.pdf`;
        pdf.save(fname);
        updateStatusLastAction(getEffectiveUiLang() === "en" ? "PDF export completed." : "已完成 PDF 导出。");
        flashSaveToast(2000);
      } finally {
        pdfExportHideOnline = prevPdfHide;
        sheetRenderLang = prevSheetLang;
        renderEnroll();
        renderGrid();
        refreshAllResolved();
        applySheetStaticI18n();
        setMetaSourceFromEnroll();
        scheduleA3PreviewScale();
      }
    }

    async function exportApplicationPackagePdf(phraseHash) {
      const uiLang = getEffectiveUiLang() === "en" ? "en" : "zh";
      const L = I18N[uiLang] || I18N.zh;
      if (typeof html2canvas === "undefined") {
        showEnrollImportToast(
          uiLang === "en"
            ? "html2canvas not loaded. Try browser Print → Save as PDF, or refresh when online."
            : "未加载 html2canvas。可改用浏览器「打印」→「另存为 PDF」，或在联网后刷新页面。"
        );
        return;
      }
      if (!window.jspdf || !window.jspdf.jsPDF) {
        showEnrollImportToast(
          uiLang === "en"
            ? "jsPDF not loaded. Try browser Print → Save as PDF, or refresh when online."
            : "未加载 jsPDF。可改用浏览器「打印」→「另存为 PDF」，或在联网后刷新页面。"
        );
        return;
      }
      const first = enrollData.courses[0] || {};
      const termText = first.学年 && first.学期 ? `${first.学年}_${String(first.学期).trim()}` : "term";
      const today = new Date();
      const dateText = today.toLocaleDateString();
      const dateStamp = formatYyyymmddLocal(today);
      const dateTimeText = today.toLocaleString();
      const metaSourceText = document.getElementById("meta-source")?.textContent?.trim() || "—";
      const termDisplay = first.学年 && first.学期 ? `${first.学年} ${formatSemesterLabel(first.学期, uiLang)}` : "—";
      const packageNo = `PKG-${dateStamp}-${String(termText).replace(/[^\w.-]+/g, "").slice(0, 18) || "TERM"}`;
      const mergedInfoHtml = `
        <div style="display:grid;grid-template-columns:170px 1fr;gap:0;border:1px solid #d7dce3;border-bottom:none;margin:8px 0 18px;">
          ${[
            [L.packageNoLabel, packageNo],
            [L.packageTermLabel, termDisplay],
            [L.packageDateLabel, dateTimeText],
            [L.packageSourceLabel, metaSourceText],
            [L.packageVersionLabel, APP_VERSION],
            [L.packagePurposeLabel, L.packagePurposeValue]
          ].map(([label, value], idx) => `
            <div style="padding:12px 14px;background:${idx % 2 === 0 ? "#f7f9fc" : "#fbfcfe"};border-bottom:1px solid #d7dce3;border-right:1px solid #d7dce3;font-weight:700;color:#1a3f6b;">${escapeHtml(label)}</div>
            <div style="padding:12px 14px;background:#fff;border-bottom:1px solid #d7dce3;color:#1f2937;">${escapeHtml(String(value || "—"))}</div>
          `).join("")}
        </div>
        <div style="padding:22px 24px;margin-bottom:18px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);border:1px solid #dbe5f0;border-radius:12px;">
          <p style="margin:0 0 10px;font-size:17px;font-weight:700;color:#1a3f6b;">${escapeHtml(L.packagePurposeLabel)}</p>
          <p style="margin:0;line-height:1.9;color:#374151;">${escapeHtml(L.packageDescription)}</p>
        </div>
        <div style="padding:18px 22px 20px;border-left:5px solid #1a3f6b;background:#f8fbff;border-radius:10px;">
          <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:#1a3f6b;">${escapeHtml(L.packageStatementTitle)}</p>
          <p style="margin:0;line-height:1.95;${uiLang === "zh" ? "text-indent:2em;" : ""}">${escapeHtml(L.packageStatementBody)}</p>
        </div>
      `;
      const mergedFooterHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:42px;row-gap:22px;">
          <div>${escapeHtml(L.packageSignStudent)}：____________________</div>
          <div>${escapeHtml(L.packageSignDate)}：____________________</div>
          <div>${escapeHtml(L.packageSignOffice)}：__________________</div>
          <div>${escapeHtml(L.packageSignSeal)}：____________________</div>
        </div>
      `;
      updateStatusLastAction(uiLang === "en" ? "Generating package page…" : "正在生成申请包首页…");
      await CourseTable.utils.nextFrame();
      /* 申请包首页副标题与日期标签随界面语言切换，避免英文界面仍混入中文标点或中文文案。 */
      const packagePageSubtitle = uiLang === "en" ? "COURSE & TIMETABLE COMPARISON PACKAGE" : L.packageStatementTitle;
      const packageTopNote = `${L.packageDateLabel}${uiLang === "en" ? ": " : "："}${dateText}`;
      const mergedCanvas = await captureDetachedHtmlCanvas(
        buildPackagePageHtml(
          L.packageCoverTitle,
          mergedInfoHtml,
          mergedFooterHtml,
          { subtitle: packagePageSubtitle, topNote: packageTopNote }
        ),
        uiLang
      );
      updateStatusLastAction(uiLang === "en" ? "Generating A3 timetable page…" : "正在生成 A3 课表页…");
      await CourseTable.utils.nextFrame();
      const a3Canvas = await captureSheetCanvas(uiLang);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      pdf.setProperties({
        title: L.packageCoverTitle,
        subject: uiLang === "en" ? "Unofficial layout aid" : "非官方排版辅助文件",
        author: "Enrollment & Timetable Comparison IX (beta)",
        keywords: uiLang === "en" ? "package, timetable, unofficial" : "申请包, 课表, 非官方排版辅助"
      });
      const addCanvasPage = (canvas, addPage) => {
        const pageW = 210;
        const pageH = 297;
        if (addPage) pdf.addPage();
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        const x = (pageW - w) / 2;
        const y = (pageH - h) / 2;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h, undefined, "FAST");
      };
      addCanvasPage(mergedCanvas, false);
      addCanvasPage(a3Canvas, true);
      const fileName = `${uiLang === "en" ? "application_package" : "申请包"}_${termText}_${dateStamp}.pdf`.replace(/[\\/:*?"<>|]+/g, "_");
      pdf.save(fileName);
      appendComplianceEvent("export_package", { fileName, phraseHash: phraseHash || "", lang: uiLang });
      updateStatusLastAction(uiLang === "en" ? "Application package exported." : "申请包已导出完成。");
      showEnrollImportToast(uiLang === "en" ? `Application package exported: ${fileName}` : `已成功导出申请包：${fileName}`);
      flashSaveToast(1800);
    }

    function runExportPackageWithCheck() {
      resolveEmptyThirdBandsBeforeExport((ready) => {
        if (!ready) return;
        const r = checkScheduleConsistency();
        openExportCheckModal(r, (meta) => {
          void (async () => {
            const phrase = meta && meta.confirmedPhrase != null ? String(meta.confirmedPhrase) : "";
            const phraseHash = meta && meta.phraseHash != null ? String(meta.phraseHash) : "";
            if (phrase) {
              try {
                appendComplianceEvent("export_phrase_confirmed", { phraseHash });
              } catch (_e) {
                /* compliance log unavailable */
              }
            }
            try {
              await exportApplicationPackagePdf(phraseHash);
            } catch (err) {
              logError("exportApplicationPackagePdf", err);
              showEnrollImportToast(String(err && err.message ? err.message : err));
            }
          })();
        });
      });
    }

    function runExportPdfWithCheck() {
      resolveEmptyThirdBandsBeforeExport((ready) => {
        if (!ready) return;
        const r = checkScheduleConsistency();
        openExportCheckModal(r, (meta) => {
          void (async () => {
            const phrase = meta && meta.confirmedPhrase != null ? String(meta.confirmedPhrase) : "";
            const phraseHash = meta && meta.phraseHash != null ? String(meta.phraseHash) : "";
            if (phrase) {
              try {
                appendComplianceEvent("export_phrase_confirmed", { phraseHash });
              } catch (_e) {
                /* compliance log unavailable */
              }
            }
            try {
              appendComplianceEvent("export_executed", { format: "pdf", phraseHash });
              await exportBilingualSchedulePdf();
            } catch (err) {
              logError("exportBilingualSchedulePdf", err);
              showEnrollImportToast(String(err && err.message ? err.message : err));
            }
          })();
        });
      });
    }

    const WEEK_CHAR_TO_KEY = {
      一: "mon",
      二: "tue",
      三: "wed",
      四: "thu",
      五: "fri",
      六: "sat",
      日: "sun",
      天: "sun"
    };

    /** 全角/半角破折号与波浪号统一为半角「-」（含周次如「1～8周」） */
    // normalizeTimeToken → window.__tsBridge
    function normalizeTimeToken(s) { return window.__tsBridge.normalizeTimeToken(s); }

    /** 去掉段尾「{…周}」类周次说明，返回正文与可读周次文案 */
    function stripTrailingWeekBracket(segment) {
      const s0 = toHalfWidthChars(String(segment == null ? "" : segment).trim());
      const m = s0.match(/\{([^}]*)\}\s*$/);
      if (!m) return { base: s0, week: "" };
      const base = s0.slice(0, m.index).trim();
      return { base, week: formatWeekPatternDisplay(m[1]) };
    }

    function formatWeekPatternDisplay(innerRaw) {
      let s = toHalfWidthChars(String(innerRaw || "").trim()).replace(/\s+/g, "");
      if (!s) return "";
      const single = /单周?$/.test(s) || /^单/.test(s);
      const double = /双周?$/.test(s) || /^双/.test(s);
      s = s.replace(/单周?$|双周?$/g, "").replace(/周$/g, "");
      if (!s) return String(innerRaw || "").trim();
      let out = s + "周";
      if (single) out += "（单周）";
      else if (double) out += "（双周）";
      return out;
    }

    /** 中文节次「一…十」→数字，用于「一至二节」 */
    function chineseLessonSpanToRangeDigits(aTok, bTok) {
      const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
      const parseOne = (tok) => {
        const t = String(tok || "").trim();
        if (/^\d+$/.test(t)) return parseInt(t, 10);
        if (map[t] != null) return map[t];
        if (t.length === 2 && t[0] === "十" && map[t[1]] != null) return 10 + map[t[1]];
        if (t.length === 2 && map[t[0]] != null && t[1] === "十") return map[t[0]] * 10;
        return null;
      };
      const lo = parseOne(aTok);
      const hi = parseOne(bTok);
      if (lo == null || hi == null) return null;
      return { lo, hi: Math.max(lo, hi), start: Math.min(lo, hi) };
    }

    /** 解析「上课时间」单段或整段前的节次归一化（逗号并列节次、节至节等） */
    function normalizeScheduleSegmentForParse(segment) {
      let s = toHalfWidthChars(String(segment == null ? "" : segment).trim());
      s = normalizeTimeToken(s);
      if (!s) return "";
      // English: "Periods 3-4" / "Period 3" → 第3-4节 / 第3节
      s = s.replace(/\bPeriods?\s+(\d{1,2})\s*[-~]\s*(\d{1,2})\b/gi, "第$1-$2节");
      s = s.replace(/\bPeriods?\s+(\d{1,2})\b/gi, "第$1节");
      // English: "Weeks 2-19" → {2-19周}
      s = s.replace(/\bWeeks?\s+(\d{1,2})\s*[-~]\s*(\d{1,2})\b/gi, "{$1-$2周}");
      s = s.replace(/周([一二三四五六日天])第(\d{1,2})\s*[,，]\s*(\d{1,2})节/g, "星期$1第$2-$3节");
      s = s.replace(/(\d{1,2})\s*[~～]\s*(\d{1,2})\s*节/g, "第$1-$2节");
      s = s.replace(
        /([一二三四五六七八九十]{1,3})至([一二三四五六七八九十]{1,3})节/g,
        (_m, a, b) => {
          const r = chineseLessonSpanToRangeDigits(a, b);
          return r ? `第${r.start}-${r.hi}节` : _m;
        }
      );
      /* 兼容“第一、二节”这类并列中文节次写法，拆成两个独立节次供后续逐段解析。 */
      s = s.replace(
        /第([一二三四五六七八九十]{1,3})[、，]([一二三四五六七八九十]{1,3})节/g,
        (_m, a, b) => {
          const r = chineseLessonSpanToRangeDigits(a, b);
          return r ? `第${r.start}节;第${r.hi}节` : _m;
        }
      );
      s = s.replace(/第(\d{1,2})节至第(\d{1,2})节/g, "第$1-$2节");
      s = s.replace(
        /(星期[一二三四五六日天]|周[一二三四五六日天])第(\d{1,2}-\d{1,2}),(\d{1,2}-\d{1,2})节/g,
        "$1第$2节;$1第$3节"
      );
      s = s.replace(/第(\d{1,2}-\d{1,2}),(\d{1,2}-\d{1,2})节/g, "第$1节;第$2节");
      s = s.replace(/(\d{1,2}-\d{1,2})\s*,\s*(\d{1,2}-\d{1,2})节/g, "第$1节;第$2节");
      return s;
    }

    /** 自动填格：整段「上课时间」先归一再按分号切段 */
    function normalizeCourseScheduleForAutofill(tf) {
      let s = toHalfWidthChars(String(tf == null ? "" : tf).trim());
      s = normalizeTimeToken(s);
      // English: "Periods 3-4" / "Period 3" → 第3-4节 / 第3节
      s = s.replace(/\bPeriods?\s+(\d{1,2})\s*[-~]\s*(\d{1,2})\b/gi, "第$1-$2节");
      s = s.replace(/\bPeriods?\s+(\d{1,2})\b/gi, "第$1节");
      // English: "Weeks 2-19" → {2-19周}
      s = s.replace(/\bWeeks?\s+(\d{1,2})\s*[-~]\s*(\d{1,2})\b/gi, "{$1-$2周}");
      s = s.replace(/周([一二三四五六日天])第(\d{1,2})\s*[,，]\s*(\d{1,2})节/g, "星期$1第$2-$3节");
      s = s.replace(/(\d{1,2})\s*[~～]\s*(\d{1,2})\s*节/g, "第$1-$2节");
      s = s.replace(
        /([一二三四五六七八九十]{1,3})至([一二三四五六七八九十]{1,3})节/g,
        (_m, a, b) => {
          const r = chineseLessonSpanToRangeDigits(a, b);
          return r ? `第${r.start}-${r.hi}节` : _m;
        }
      );
      /* 自动填格与明细解析保持同口径，兼容“第一、二节”并列写法。 */
      s = s.replace(
        /第([一二三四五六七八九十]{1,3})[、，]([一二三四五六七八九十]{1,3})节/g,
        (_m, a, b) => {
          const r = chineseLessonSpanToRangeDigits(a, b);
          return r ? `第${r.start}节;第${r.hi}节` : _m;
        }
      );
      s = s.replace(/第(\d{1,2})节至第(\d{1,2})节/g, "第$1-$2节");
      s = s.replace(
        /(星期[一二三四五六日天]|周[一二三四五六日天])第(\d{1,2}-\d{1,2}),(\d{1,2}-\d{1,2})节/g,
        "$1第$2节;$1第$3节"
      );
      s = s.replace(/第(\d{1,2}-\d{1,2}),(\d{1,2}-\d{1,2})节/g, "第$1节;第$2节");
      s = s.replace(/(\d{1,2}-\d{1,2})\s*,\s*(\d{1,2}-\d{1,2})节/g, "第$1节;第$2节");
      return s;
    }

    // parseWeekdayKeyInText → window.__tsBridge
    function parseWeekdayKeyInText(text) { return window.__tsBridge.parseWeekdayKeyInText(text); }

    function slotLessonBounds(slotKey) {
      const slot = SLOTS.find((x) => x.key === slotKey);
      if (!slot) return null;
      const lab = normalizeTimeToken(toHalfWidthChars(slot.label));
      const m = lab.match(/第(\d+)-(\d+)节/);
      if (!m) return null;
      return { key: slotKey, lo: parseInt(m[1], 10), hi: parseInt(m[2], 10) };
    }

    function slotKeysCoveringLessonRange(start, end) {
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      const keys = [];
      for (const slot of SLOTS) {
        const b = slotLessonBounds(slot.key);
        if (!b) continue;
        if (lo <= b.hi && hi >= b.lo) keys.push(slot.key);
      }
      return keys;
    }

    /**
     * 从「星期三第3-4节{2-19周}」等片段得到若干 { dayKey, slotKey, weekPattern? }。
     * 支持段尾 {1-16周}、{1-8,10-16周}、{1-16单周} 等；全角符号先转半角。
     */
    function parseOneScheduleSegment(segment) {
      const full = String(segment == null ? "" : segment).trim();
      if (!full) return [];
      const hasTopLevelSemi = /[;；]/.test(toHalfWidthChars(full));
      let weekOuter = "";
      let work = full;
      if (!hasTopLevelSemi) {
        const st = stripTrailingWeekBracket(full);
        work = st.base;
        weekOuter = st.week;
      }
      const normalized = normalizeScheduleSegmentForParse(work);
      if (!normalized) return [];
      if (/[;；]/.test(normalized)) {
        const pieces = normalized.split(/[;；]/).map((x) => x.trim()).filter(Boolean);
        const merged = [];
        for (const p of pieces) {
          merged.push(...parseOneScheduleSegment(p));
        }
        const seen = new Set();
        const out = [];
        for (const pt of merged) {
          const k = `${pt.dayKey}-${pt.slotKey}`;
          if (seen.has(k)) continue;
          seen.add(k);
          if (weekOuter && !pt.weekPattern) pt.weekPattern = weekOuter;
          out.push(pt);
        }
        return out;
      }
      const raw = normalized;
      const dayKey = parseWeekdayKeyInText(raw);
      if (!dayKey || !DAYS.some((d) => d.key === dayKey)) return [];
      let start;
      let end;
      let m = raw.match(/第(\d{1,2})-(\d{1,2})节/);
      if (m) {
        start = parseInt(m[1], 10);
        end = parseInt(m[2], 10);
      } else {
        m = raw.match(/第(\d{1,2})节/);
        if (m) {
          start = end = parseInt(m[1], 10);
        } else {
          return [];
        }
      }
      if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
      /* 单节次如「第3节」应落入首个包含该节次的课表槽位，如 p34。 */
      const slotKeys = slotKeysCoveringLessonRange(start, end);
      const out = [];
      for (const sk of slotKeys) {
        out.push({ dayKey, slotKey: sk, weekPattern: weekOuter || "" });
      }
      return out;
    }

    /** 当前格对应的周次提示（小字），按分号段与星期节次对齐 */
    function weekHintForCell(course, dayKey, slotKey) {
      const full = course != null && course.上课时间 != null ? String(course.上课时间).trim() : "";
      if (!full) return "";
      const merged = normalizeCourseScheduleForAutofill(full);
      const parts = merged.split(/[;；]/).map((x) => x.trim()).filter(Boolean);
      for (const part of parts) {
        const pts = parseOneScheduleSegment(part);
        if (pts.some((pt) => pt.dayKey === dayKey && pt.slotKey === slotKey && pt.weekPattern)) {
          const hit = pts.find((pt) => pt.dayKey === dayKey && pt.slotKey === slotKey);
          return hit && hit.weekPattern ? String(hit.weekPattern) : "";
        }
      }
      return "";
    }

    function parseCourseToSchedulePlacements(course) {
      const tf = course != null ? course.上课时间 : "";
      if (!tf || !String(tf).trim()) return [];
      const merged = normalizeCourseScheduleForAutofill(tf);
      const parts = merged.split(/[;；]/).map((x) => x.trim()).filter(Boolean);
      const seen = new Set();
      const res = [];
      for (const p of parts) {
        const pts = parseOneScheduleSegment(p);
        for (const pt of pts) {
          const k = `${pt.dayKey}-${pt.slotKey}`;
          if (seen.has(k)) continue;
          seen.add(k);
          res.push(pt);
        }
      }
      return res;
    }

    /** 选课表中「上课时间」解析后落在该周课表格子的课程列表（去重按课程） */
    function listCoursesTargetingCell(slotId) {
      const list = [];
      for (const course of enrollData.courses) {
        if (course.网课) continue;
        const placements = parseCourseToSchedulePlacements(course);
        for (const p of placements) {
          if (cellId(p.dayKey, p.slotKey) === slotId) {
            list.push(course);
            break;
          }
        }
      }
      return list;
    }

    function scheduleCellPositionLabel(slotId) {
      const { dayKey, slotKey } = parseCellId(slotId);
      const day = DAYS.find((d) => d.key === dayKey);
      const slot = SLOTS.find((s) => s.key === slotKey);
      if (!day || !slot) return slotId;
      const Lpack = I18N[getEffectiveUiLang()] || I18N.zh;
      const dl = (Lpack.days && Lpack.days[dayKey]) || day.label;
      const sl = (Lpack.slots && Lpack.slots[slotKey]) || slot.label;
      return `${dl} ${sl}`;
    }

    /** 三课同格 +N 徽章：悬停列出未能与两栏并排容纳的课程名（自第 3 门起） */
    function buildOverflowBadgeTitle(slotId) {
      const targets = listCoursesTargetingCell(slotId);
      if (targets.length < 3) {
        return "该时段选课表中超过两门课重叠，多出的课程未自动填入，请手动核对";
      }
      const extras = targets.slice(2);
      const names = extras.map((c) => {
        const n = c.课程名称 != null ? String(c.课程名称).trim() : "";
        return n || "（无名称）";
      });
      return "该时段以下课程重叠未自动填入：" + names.join("、") + "。请手动核对。";
    }

    function gridCellHasTwoOccupiedBands(slotId, state) {
      const raw = state[slotId] != null ? String(state[slotId]) : "";
      const [va, vb] = splitCellBands(raw);
      return Boolean(String(va || "").trim() && String(vb || "").trim());
    }

    function recomputeOverflowTripleSameSlotCellIds() {
      overflowTripleSameSlotCellIds.clear();
      const state = gridState();
      for (const day of DAYS) {
        for (const slot of SLOTS) {
          const sid = cellId(day.key, slot.key);
          if (listCoursesTargetingCell(sid).length < 3) continue;
          if (!gridCellHasTwoOccupiedBands(sid, state)) continue;
          overflowTripleSameSlotCellIds.add(sid);
        }
      }
    }

    function applyOverflowTripleMarkersToDom() {
      const state = gridState();
      document.querySelectorAll(".cell[data-cell]").forEach((cellEl) => {
        const sid = cellEl.dataset.cell;
        if (!sid) return;
        const nTarget = listCoursesTargetingCell(sid).length;
        const twoFull = gridCellHasTwoOccupiedBands(sid, state);
        const overflow = nTarget >= 3 && twoFull;
        const excess = overflow ? nTarget - 2 : 0;
        cellEl.classList.toggle("cell-overflow", overflow);
        const old = cellEl.querySelector(".badge-overflow");
        if (!overflow) {
          if (old) old.remove();
          delete cellEl.dataset.tripleScheduleOverflow;
          return;
        }
        let badge = old;
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "badge-overflow no-print";
          badge.setAttribute("aria-hidden", "true");
          cellEl.insertBefore(badge, cellEl.firstChild);
        }
        badge.title = buildOverflowBadgeTitle(sid);
        badge.textContent = "+" + String(excess);
        cellEl.dataset.tripleScheduleOverflow = "1";
      });
    }

    function syncOverflowTripleSameSlotUi() {
      recomputeOverflowTripleSameSlotCellIds();
      applyOverflowTripleMarkersToDom();
    }

    function collectTripleSameSlotIssues() {
      const tripleSameSlots = [];
      for (const day of DAYS) {
        for (const slot of SLOTS) {
          const sid = cellId(day.key, slot.key);
          const targets = listCoursesTargetingCell(sid);
          if (targets.length < 3) continue;
          tripleSameSlots.push({
            cellId: sid,
            positionLabel: scheduleCellPositionLabel(sid),
            courses: targets.map((c) => ({
              序号: c.序号,
              课程名称: c.课程名称 != null ? String(c.课程名称) : ""
            }))
          });
        }
      }
      return tripleSameSlots;
    }

    /* 自动填格前收集三栏已满仍有课程落入的时段，先提醒用户人工核对。 */
    function buildAutofillFullCellConflictMessage(conflicts) {
      const lines = conflicts.map((item) => {
        const names = item.courseNames.filter(Boolean).join("、") || "—";
        return `${getCellDisplayLabel(item.cellId)}：${names}`;
      });
      return `以下时段已有三门课程，无法再自动填入。请在导出前手动核对：\n${lines.join("\n")}`;
    }

    function applyJoinedValueToCellInputs(id, joinedStr) {
      const cell = document.querySelector(`.cell[data-cell="${id}"]`);
      if (!cell) return;
      const [va, vb, vc] = splitCellBands(String(joinedStr || ""));
      const i0 = cell.querySelector('input.idx-band[data-band="0"]');
      const i1 = cell.querySelector('input.idx-band[data-band="1"]');
      const i2 = cell.querySelector('input.idx-band[data-band="2"]');
      if (i0 instanceof HTMLInputElement) i0.value = va;
      if (i1 instanceof HTMLInputElement) i1.value = vb;
      if (i2 instanceof HTMLInputElement) i2.value = vc;
    }

    async function applyAutofillFromSchedule() {
      // 先清空周课表，再重新填入（问题十二）
      const emptyGrid = Object.create(null);
      writeGridStorage(emptyGrid);
      activeThirdBandCellIds = new Set();
      saveStoredActiveThirdBands(activeThirdBandCellIds);
      renderGrid(); // 同步清空 DOM 输入框，避免手动数据残留

      const prev = Object.assign(Object.create(null), gridModel);
      const next = Object.assign(Object.create(null), gridModel);
      let filled = 0;
      let skipped = 0;
      const skippedCellIds = new Set();
      const courses = enrollData.courses;
      const bigCourseList = courses.length > 30;

      for (let ci = 0; ci < courses.length; ci++) {
        if (bigCourseList && ci > 0 && ci % 6 === 0) {
          updateStatusLastAction(
            getEffectiveUiLang() === "en"
              ? `Autofill computing (${ci}/${courses.length})…`
              : `正在自动填格（${ci}/${courses.length}）…`
          );
          await CourseTable.utils.nextFrame();
        }
        const course = courses[ci];
        if (course.网课) continue;
        const idxNum = parseInt(String(course.序号 != null ? course.序号 : ""), 10);
        if (!Number.isFinite(idxNum) || idxNum < 1) continue;
        const idxStr = String(idxNum);
        const placements = parseCourseToSchedulePlacements(course);
        for (const { dayKey, slotKey } of placements) {
          const id = cellId(dayKey, slotKey);
          const cur = next[id] != null ? String(next[id]) : "";
          const [a0, b0, c0] = splitCellBands(cur);
          const existingNums = [a0, b0, c0].map((v) => parseBandToken(v)).filter((n) => Number.isFinite(n));
          if (existingNums.includes(idxNum)) {
            skipped++;
            skippedCellIds.add(id);
            continue;
          }
          // 问题六：无条件填入，A→B→C 顺序，超出三栏用溢出标记，不弹窗
          if (!a0) {
            next[id] = joinBands(idxStr, b0, c0);
            filled++;
            continue;
          }
          if (!b0) {
            next[id] = joinBands(a0, idxStr, c0);
            filled++;
            continue;
          }
          if (!c0) {
            next[id] = joinBands(a0, b0, idxStr);
            activeThirdBandCellIds.add(id);
            filled++;
            continue;
          }
          // 三栏已满：记录溢出，不弹窗
          skipped++;
          skippedCellIds.add(id);
        }
      }
      saveStoredActiveThirdBands(activeThirdBandCellIds);

      writeGridStorage(next);
      const changedIds = [];
      const allKeys = new Set([].concat(Object.keys(prev), Object.keys(next)));
      allKeys.forEach((k) => {
        if ((prev[k] || "") !== (next[k] || "")) changedIds.push(k);
      });
      if (changedIds.length) {
        updateStatusLastAction(
          getEffectiveUiLang() === "en"
            ? `Applying autofill to grid (0/${changedIds.length})…`
            : `正在把自动填格结果写入周课表（0/${changedIds.length}）…`
        );
        await CourseTable.utils.chunkedRafIterate(
          changedIds,
          (cid) => {
            applyJoinedValueToCellInputs(cid, next[cid] != null ? String(next[cid]) : "");
            updateCellDisplay(cid);
          },
          8,
          (done, total) => {
            if (total > 16) {
              updateStatusLastAction(
                getEffectiveUiLang() === "en"
                  ? `Applying autofill to grid (${done}/${total})…`
                  : `正在把自动填格结果写入周课表（${done}/${total}）…`
              );
            }
          }
        );
      }
      syncOverflowTripleSameSlotUi();
      scheduleAppStateCommit();
      scheduleA3PreviewScale();
      document.querySelectorAll(".cell.cell-overflow .badge-overflow").forEach((badge) => {
        const cellEl = badge.closest(".cell[data-cell]");
        const sid = cellEl && cellEl.dataset.cell;
        if (sid) badge.title = buildOverflowBadgeTitle(sid);
      });
      skippedCellIds.forEach((cid) => {
        const cellEl = document.querySelector(`.cell[data-cell="${cid}"]`);
        if (!cellEl) return;
        cellEl.classList.add("cell--skipped-flash");
        window.setTimeout(() => {
          cellEl.classList.remove("cell--skipped-flash");
        }, 3000);
      });
      appendComplianceEvent("autofill_schedule", { filled, skipped });
      updateStatusLastAction(
        getEffectiveUiLang() === "en"
          ? `Autofill completed (${filled} filled, ${skipped} skipped).`
          : `自动填格完成（填入 ${filled} 处，跳过 ${skipped} 处）。`
      );
      const t = document.getElementById("save-toast");
      if (t) {
        let msg = `已按「上课时间」自动填入 ${filled} 处；${skipped} 处跳过（格已满或与已有序号相同）。`;
        if (overflowTripleSameSlotCellIds.size > 0) {
          msg += ` 其中 ${overflowTripleSameSlotCellIds.size} 个格因三门及以上课程同时段已显示「+N」溢出标记，请将鼠标悬停在 +N 上查看未填入课程名，并在导出前对照检查中核对。`;
        }
        if (skipped > 0) {
          msg += " 已跳过的格子会短暂浅黄闪烁提示。";
        }
        t.textContent = msg;
        t.hidden = false;
        window.setTimeout(() => {
          t.hidden = true;
          flashSaveToast(2000);
        }, 2400);
      } else {
        flashSaveToast(2000);
      }
    }

    let persistTimer = null;

    function flushPersistGridNow() {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      writeGridStorage(gridState());
    }

    function persistGridSoon() {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        persistTimer = null;
        try {
          writeGridStorage(gridState());
          scheduleAppStateCommit();
          const _L = I18N[getEffectiveUiLang()] || I18N.zh;
          updateStatusLastAction(_L.autoSaveMsg);
          const t = document.getElementById("save-toast");
          if (t) {
            t.hidden = false;
            setTimeout(() => {
              t.hidden = true;
            }, 1600);
          }
        } catch (_e) {
          /* ignore */
        }
      }, 450);
    }

    /** 与选课表「上课时间」大致对应的演示填格（非解析器，仅示意） */
    const DEMO = {
      "mon-p34": "6",
      "mon-p78": "9",
      "tue-p12": "10",
      "tue-p34": "5",
      "tue-p910": "9",
      "wed-p34": "3|4",
      "wed-p910": "4",
      "wed-p1112": "4",
      "thu-p34": "7",
      "thu-p56": "10",
      "thu-p78": "16",
      "fri-p56": "3"
    };

    function applyDemo() {
      document.querySelectorAll(".cell[data-cell]").forEach((cell) => {
        const id = cell.dataset.cell;
        const demo = Object.prototype.hasOwnProperty.call(DEMO, id) ? DEMO[id] : "";
        const [va, vb, vc] = splitCellBands(demo);
        const i0 = cell.querySelector('input.idx-band[data-band="0"]');
        const i1 = cell.querySelector('input.idx-band[data-band="1"]');
        const i2 = cell.querySelector('input.idx-band[data-band="2"]');
        if (i0) i0.value = va;
        if (i1) i1.value = vb;
        if (i2) i2.value = vc;
        markCellDirty(id);
      });
      flushPendingGridCellsNow();
      writeGridStorage(gridState());
      appendComplianceEvent("demo_indices_loaded");
      updateStatusLastAction(getEffectiveUiLang() === "en" ? "Demo indices loaded." : "已填入演示序号。");
      scheduleAppStateCommit();
      const st = document.getElementById("save-toast");
      if (st) {
        st.hidden = false;
        st.textContent = getEffectiveUiLang() === "en" ? "Demo saved locally." : "演示序号已写入本机。";
        window.setTimeout(() => {
          st.hidden = true;
        }, 1400);
      }
    }

    function clearWeeklyGrid() {
      commitAppStateSnapshotNow();
      writeGridStorage({});
      overflowTripleSameSlotCellIds.clear();
      activeThirdBandCellIds = new Set();
      saveStoredActiveThirdBands(activeThirdBandCellIds);
      renderGrid();
      refreshAllResolved();
      scheduleAppStateCommit();
      updateUndoButtonState();
      const msg = (I18N[getEffectiveUiLang()] || I18N.zh).btnClear + "。";
      showEnrollImportToast(msg);
      appendComplianceEvent("clear_weekly_grid");
      updateStatusLastAction(msg);
    }

    document.getElementById("btn-demo").addEventListener("click", applyDemo);
    document.getElementById("btn-autofill-schedule").addEventListener("click", () => {
      void applyAutofillFromSchedule();
    });
    document.getElementById("btn-save-manual").addEventListener("click", manualSaveCurrentWork);
    document.getElementById("btn-clear").addEventListener("click", clearWeeklyGrid);
    document.getElementById("btn-print").addEventListener("click", () => {
      requestAnimationFrame(() => {
        if (isPageTranslated()) {
          warnAndBlockForTranslation();
          return;
        }
        runPrintWithCheck();
      });
    });
      const btnExportPdf = document.getElementById("btn-export-pdf");
    if (btnExportPdf) btnExportPdf.addEventListener("click", () => {
      requestAnimationFrame(() => {
        if (isPageTranslated()) {
          warnAndBlockForTranslation();
          return;
        }
        runExportPdfWithCheck();
      });
    });
      const btnExportPackage = document.getElementById("btn-export-package");
    if (btnExportPackage) btnExportPackage.addEventListener("click", () => {
      requestAnimationFrame(() => {
        if (isPageTranslated()) {
          warnAndBlockForTranslation();
          return;
        }
        runExportPackageWithCheck();
      });
    });
    document.getElementById("btn-undo").addEventListener("click", () => undoGrid());
    document.getElementById("btn-redo").addEventListener("click", () => redoGrid());

    document.getElementById("btn-enroll-sample-zh").addEventListener("click", () => {
      try {
        downloadEnrollSample("zh");
        showEnrollImportToast((I18N[getEffectiveUiLang()] || I18N.zh).enrollImportSampleZhStart);
      } catch (err) {
        showEnrollImportError((I18N[getEffectiveUiLang()] || I18N.zh).btnSampleZhExcel, err);
      }
    });

    document.getElementById("btn-enroll-sample-en").addEventListener("click", () => {
      try {
        downloadEnrollSample("en");
        showEnrollImportToast((I18N[getEffectiveUiLang()] || I18N.zh).enrollImportSampleEnStart);
      } catch (err) {
        showEnrollImportError((I18N[getEffectiveUiLang()] || I18N.zh).btnSampleEnExcel, err);
      }
    });

    document.getElementById("btn-enroll-import").addEventListener("click", () => {
      document.getElementById("enroll-file-input").click();
    });

    function openImportPreviewModal(previewHtml, onConfirm) {
      const modal = document.getElementById("import-preview-modal");
      const body = document.getElementById("import-preview-body");
      const ok = document.getElementById("import-preview-ok");
      const cancel = document.getElementById("import-preview-cancel");
      const backdrop = document.getElementById("import-preview-backdrop");
      if (!modal || !body || !ok || !cancel) {
        if (window.confirm("确认导入预览数据？")) void Promise.resolve(onConfirm()).catch(() => {});
        return;
      }
      body.innerHTML = previewHtml;
      modal.hidden = false;
      const close = () => {
        modal.hidden = true;
        body.innerHTML = "";
        ok.onclick = null;
        cancel.onclick = null;
        if (backdrop) backdrop.onclick = null;
      };
      ok.onclick = () => {
        close();
        void Promise.resolve(onConfirm()).catch(() => {});
      };
      cancel.onclick = close;
      if (backdrop) backdrop.onclick = close;
    }

    function analyzeImportPreviewRows(aoa) {
      const list = [];
      const rows = Array.isArray(aoa) ? aoa : [];
      if (!rows.length) return { mode: "empty", skipped: list };
      const fixedMode = aoaUsesFixedXlsxLayout(rows);
      if (fixedMode) {
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r] || [];
          const normalized = ENROLL_XLSX_FIXED_COLS.map((_key, i) => normalizeCell(row[i]));
          const any = normalized.some(Boolean);
          if (!any) continue;
          const maybeName = normalized[2] || "";
          const maybeYear = normalized[0] || "";
          const maybeTerm = normalized[1] || "";
          const okShape = rowLooksLikeFixedXlsxDataRow(row);
          const tolerantShape = any && maybeName && /^\d{4}\s*-\s*\d{4}$/.test(maybeYear) && /^[12]$/.test(maybeTerm);
          if (!okShape && !tolerantShape) {
            let reason = "不符合教务固定 10 列格式";
            if (!maybeYear) reason = "缺少学年";
            else if (!/^\d{4}\s*-\s*\d{4}$/.test(maybeYear)) reason = "学年格式应为 2025-2026";
            else if (!maybeTerm) reason = "缺少学期";
            else if (!/^[12]$/.test(maybeTerm)) reason = "学期仅支持 1 或 2";
            else if (!maybeName) reason = "缺少课程名称";
            list.push({ row: r + 1, reason });
          }
        }
        return { mode: "fixed", skipped: list };
      }
      const hri = findEnrollHeaderRowIndex(rows);
      if (hri < 0) {
        return { mode: "unknown", skipped: [{ row: 1, reason: "未识别到表头，也不符合教务固定格式" }] };
      }
      const headerRow = rows[hri] || [];
      const colIndex = Object.create(null);
      headerRow.forEach((cell, i) => {
        const canon = mapExcelHeaderToCanonical(cell);
        if (canon && colIndex[canon] === undefined) colIndex[canon] = i;
      });
      if (colIndex["课程名称"] === undefined) {
        return { mode: "header", skipped: [{ row: hri + 1, reason: "表头缺少“课程名称”列" }] };
      }
      for (let r = hri + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const get = (key) => {
          const j = colIndex[key];
          return j === undefined ? "" : normalizeCell(row[j]);
        };
        const courseName = get("课程名称");
        const timeText = get("上课时间");
        const placeText = get("上课地点");
        const hasAnyUsefulCell = row.some((cell) => normalizeCell(cell) !== "");
        if (!hasAnyUsefulCell) continue;
        if (!courseName && !timeText && !placeText) {
          list.push({ row: r + 1, reason: "空白或仅含无关列，已跳过" });
          continue;
        }
        if (!courseName) {
          list.push({ row: r + 1, reason: "缺少课程名称" });
        }
      }
      return { mode: "header", skipped: list };
    }

    function buildImportPreviewHtml(parsed, aoa) {
      const rows = (parsed && parsed.courses ? parsed.courses : []).slice(0, 3);
      const tableRows = rows.map((row) => `
        <tr>
          <td>${escapeHtml(String(row.课程名称 || "—"))}</td>
          <td>${escapeHtml(String(row.上课时间 || "—"))}</td>
          <td>${escapeHtml(String(row.上课地点 || "—"))}</td>
        </tr>`).join("");
      const analysis = analyzeImportPreviewRows(aoa);
      const skipped = analysis.skipped || [];
      return `
        <p>以上为即将导入的前 3 条数据。确认格式正确？点击“确认导入”继续，点击“取消”放弃。</p>
        <table class="import-preview-table">
          <thead><tr><th>课程名称</th><th>上课时间</th><th>上课地点</th></tr></thead>
          <tbody>${tableRows || '<tr><td colspan="3">无可预览数据</td></tr>'}</tbody>
        </table>
        ${skipped.length ? `<p style="margin-top:10px;"><strong>检测到可能跳过的行：</strong></p><ul>${skipped.slice(0, 12).map((x) => `<li>第 ${x.row} 行：${escapeHtml(x.reason)}</li>`).join("")}</ul>${skipped.length > 12 ? `<p>其余 ${skipped.length - 12} 行未展开显示。</p>` : ""}` : ""}
      `;
    }

    document.getElementById("enroll-file-input").addEventListener("change", async (ev) => {
      const input = ev.target;
      const f = input.files && input.files[0];
      input.value = "";
      if (!f) return;
      const _Li = I18N[getEffectiveUiLang()] || I18N.zh;
      if (!window.confirm(_Li.enrollImportConfirm)) {
        return;
      }
      if (typeof XLSX === "undefined") {
        showEnrollImportToast(_Li.enrollImportNoLib);
        return;
      }
      try {
        updateStatusLastAction(_Li.enrollImportReading);
        await CourseTable.utils.nextFrame();
        let wb;
        const lower = f.name.toLowerCase();
        if (lower.endsWith(".csv")) {
          const text = await readFileAsTextUtf8(f);
          wb = XLSX.read(text, { type: "string" });
        } else {
          const buf = await readFileAsArrayBuffer(f);
          wb = XLSX.read(buf, { type: "array" });
        }
        updateStatusLastAction(_Li.enrollImportBuilding);
        await CourseTable.utils.nextFrame();
        const name = pickEnrollWorkbookSheetName(wb);
        const sheet = wb.Sheets[name];
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
        const data = parseEnrollAoa(aoa);
        const proceedImport = async () => {
          updateStatusLastAction(getEffectiveUiLang() === "en" ? "Applying course data…" : "正在应用课程数据…");
          await CourseTable.utils.nextFrame();
          writeGridStorage(Object.create(null));
          activeThirdBandCellIds = new Set();
          saveStoredActiveThirdBands(activeThirdBandCellIds);
          enrollData = data;
          normalizeEnrollShape(enrollData, { importedFromExcel: true });
          lastEnrollImportMeta = { fileName: f.name || "", importedAt: new Date().toLocaleString() };
          lastEnrollRenderKey = "";
          saveEnrollToStorage(enrollData, true);
          const autoCourses = enrollData.courses.filter((c) => c.网课 && c.网课来源 === "auto");
          const renderAfterImport = async () => {
            renderEnroll();
            await CourseTable.utils.nextFrame();
            refreshAllResolved();
            scheduleA3PreviewScale();
            scheduleAppStateCommit();
          };
          await renderAfterImport();
          appendComplianceEvent("import_excel_result", { success: true, courseCount: enrollData.courses.length, fileName: f.name || "" });
          updateStatusLastAction(getEffectiveUiLang() === "en" ? `Excel import succeeded (${enrollData.courses.length} courses).` : `导入 Excel 成功（${enrollData.courses.length} 门课程）。`);
          showEnrollImportToast(`已导入 ${enrollData.courses.length} 门课程并保存到本机。`);
          if (autoCourses.length) {
            const preview = autoCourses.slice(0, 12).map((c) => `*${String(c.课程名称 || "未命名课程")}`).join("\n");
            const keep = window.confirm(`系统检测到以下 ${autoCourses.length} 门课程可能为网课，已自动标记（序号前带 *）：\n${preview}${autoCourses.length > 12 ? "\n…" : ""}\n\n是否保留这些自动标记？您可以手动修改。`);
            if (!keep) {
              autoCourses.forEach((c) => {
                c.网课 = false;
                c.网课来源 = "manual";
              });
              saveEnrollToStorage(enrollData, true);
              await renderAfterImport();
            }
          }
        };
        openImportPreviewModal(buildImportPreviewHtml(data, aoa), proceedImport);
      } catch (err) {
        appendComplianceEvent("import_excel_result", { success: false, courseCount: 0, fileName: f.name || "" });
        showEnrollImportError("导入 Excel 选课表", err);
      }
    });

    document.getElementById("btn-enroll-reset").addEventListener("click", () => {
      const _Lr = I18N[getEffectiveUiLang()] || I18N.zh;
      enrollData = getEffectiveUiLang() === "en" ? cloneEnroll(ENROLL_SAMPLE_EN) : cloneEnroll(ENROLL_DEFAULT);
      normalizeEnrollShape(enrollData, { restoredFromStorage: true });
      lastEnrollImportMeta = { fileName: "", importedAt: "" };
      lastEnrollRenderKey = "";
      try {
        localStorage.removeItem(LS_KEY_ENROLL);
        localStorage.removeItem(currentEnrollStorageKey());
        localStorage.removeItem(currentEnrollStorageKey() + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_ENROLL + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_ENROLL_ZH + STORAGE_BACKUP_SUFFIX);
        localStorage.removeItem(LS_KEY_ENROLL_EN + STORAGE_BACKUP_SUFFIX);
      } catch (_e) {
        /* ignore */
      }
      renderEnroll();
      refreshAllResolved();
      scheduleA3PreviewScale();
      scheduleAppStateCommit();
      updateStatusLastAction(_Lr.enrollResetMsg);
      showEnrollImportToast(_Lr.enrollResetMsg);
    });

    function bindSidebarOverlayToggle() {
      const root = document.querySelector(".layout-root");
      const toggle = document.getElementById("sidebar-open-toggle");
      const backdrop = document.getElementById("sidebar-backdrop");
      const aside = document.getElementById("sidebar-editor");
      if (!root || !toggle || toggle.dataset.sidebarToggleBound) {
        return;
      }
      toggle.dataset.sidebarToggleBound = "1";
      const setOpen = (open) => {
        root.classList.toggle("sidebar-overlay-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (backdrop) {
          backdrop.setAttribute("aria-hidden", open ? "false" : "true");
        }
        if (aside) {
          if (window.innerWidth < 1100) {
            aside.setAttribute("aria-hidden", open ? "false" : "true");
          } else {
            aside.removeAttribute("aria-hidden");
          }
        }
      };
      toggle.addEventListener("click", () => {
        setOpen(!root.classList.contains("sidebar-overlay-open"));
      });
      backdrop?.addEventListener("click", () => setOpen(false));
      window.addEventListener(
        "resize",
        () => {
          if (window.innerWidth >= 1100) {
            setOpen(false);
          }
        },
        { passive: true }
      );
    }

    bindSidebarOverlayToggle();
    bindServiceConsentBannerOnce();
    showServiceConsentBannerIfNeeded();

    /** 预览区：A3 版芯等比例缩放入栏，打印时由 CSS 取消 transform */
    function syncA3PreviewScale() {
      const viewport = document.getElementById("a3-scale-viewport");
      const inner = document.getElementById("a3-scale-inner");
      const sheet = document.querySelector(".a3-sheet");
      const badge = document.getElementById("preview-scale-badge");
      if (!viewport || !inner || !sheet) {
        return;
      }
      inner.style.transform = "none";
      inner.style.width = "";
      inner.style.height = "";
      viewport.style.height = "";
      viewport.style.minHeight = "";
      const rect = sheet.getBoundingClientRect();
      const naturalW = rect.width;
      const naturalH = rect.height;
      if (naturalW < 8 || naturalH < 8) {
        return;
      }
      const pad = 12;
      const avail = Math.max(120, viewport.clientWidth - pad);
      const scale = Math.min(1, avail / naturalW);
      inner.style.width = naturalW + "px";
      inner.style.height = naturalH + "px";
      inner.style.transform = "scale(" + scale + ")";
      inner.style.transformOrigin = "top center";
      const scaledH = naturalH * scale;
      viewport.style.height = scaledH + "px";
      viewport.style.minHeight = scaledH + "px";
      if (badge) {
        const pct = Math.round(scale * 100);
        const Lbr = I18N[getEffectiveUiLang()] || I18N.zh;
        badge.textContent = scale < 0.999 ? Lbr.previewScalePct(pct) : Lbr.previewScale100;
      }
    }

    function scheduleA3PreviewScale() {
      if (a3ScaleRafId != null) {
        window.cancelAnimationFrame(a3ScaleRafId);
        a3ScaleRafId = null;
      }
      a3ScaleRafId = window.requestAnimationFrame(() => {
        a3ScaleRafId = null;
        syncA3PreviewScale();
      });
    }

    const a3Viewport = document.getElementById("a3-scale-viewport");
    if (a3Viewport && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => scheduleA3PreviewScale());
      ro.observe(a3Viewport);
    }
    window.addEventListener("resize", scheduleA3PreviewScale, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleA3PreviewScale).catch(() => scheduleA3PreviewScale());
    }

    initSessionPersistenceMode();
    applySlotParamsToInputs();
    bindSlotParamInputsOnce();
    bindLangControlsOnce();
    bindExportCheckModalOnce();
    bindServiceConsentModalOnce();
    bindCacheClearOnce();
    bindImportBackupOnce();

    window.addEventListener("beforeunload", () => {
      try {
        sessionStorage.setItem(SESSION_KEY_REFRESH_MARK, "1");
        saveCurrentSessionData();
      } catch (_e) {
        /* ignore */
      }
    });

    window.addEventListener("pagehide", (ev) => {
      try {
        if (!ev.persisted) {
          sessionStorage.removeItem(SESSION_KEY_PAGE_SESSION_ACTIVE);
        }
      } catch (_e) {
        /* ignore */
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (!(ev.ctrlKey || ev.metaKey)) return;
      const key = String(ev.key || "").toLowerCase();
      if (key === "z" && !ev.shiftKey) {
        ev.preventDefault();
        undoGrid();
        return;
      }
      if ((key === "z" && ev.shiftKey) || key === "y" || ev.code === "KeyY") {
        ev.preventDefault();
        redoGrid();
      }
    });

    renderEnroll();
    renderGrid();
    renderPersistentStatusBar();
    commitAppStateSnapshotNow();
    scheduleA3PreviewScale();
    ensureServiceConsentForSession();

    if (gridRestoredFromBackup || enrollRestoredFromBackup || englishNamesRestoredFromBackup || slotParamsRestoredFromBackup) {
      showEnrollImportToast(
        getEffectiveUiLang() === "en"
          ? "Recovered data from local backup (primary storage was missing or unreadable)."
          : "主存储数据缺失或无法解析，已从本机备份恢复（课表 / 选课表 / 英文课名 / 时段参数中的一项或多项）。"
      );
    }

    CourseTable.constants = {
      DAYS,
      SLOTS,
      LS_KEY,
      LS_KEY_GRID_BAK,
      STORAGE_BACKUP_SUFFIX,
      LS_KEY_ENROLL,
      LS_KEY_ENROLL_ZH,
      LS_KEY_ENROLL_EN,
      LS_KEY_SLOT_PARAMS,
      APP_HISTORY_MAX
    };
    CourseTable.storage = {
      loadGrid,
      writeGridStorage,
      flushEnrollSaveNow,
      saveEnrollToStorage,
      loadEnrollFromStorage,
      loadSlotParams,
      saveSlotParams,
      loadEnglishByIndex,
      saveEnglishByIndex,
      flushPersistGridNow,
      persistGridSoon
    };
    CourseTable.grid = {
      renderGrid,
      updateCellDisplay,
      refreshAllResolved,
      gridState,
      markCellDirty,
      flushPendingGridCellsNow,
      persistGridSoon,
      flushPersistGridNow
    };
    CourseTable.schedule = {
      applyAutofillFromSchedule,
      parseCourseToSchedulePlacements
    };
    CourseTable.enroll = { renderEnroll };
    CourseTable.i18n = {
      I18N,
      getEffectiveUiLang,
      applySidebarI18n,
      applySheetStaticI18n
    };
    })(window, document);
