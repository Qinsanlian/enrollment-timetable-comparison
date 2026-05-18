// src/ui/grid-renderer.js
// 周课表渲染模块 - 完全独立，不依赖 __tsBridge 中的 UI 辅助函数
(function() {
  // ========== 从原 legacy.js 中提取的必要辅助函数 ==========
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toHalfWidthChars(s) {
    return String(s == null ? '' : s)
      .replace(/\u3000/g, ' ')
      .replace(/[\uff01-\uff5e]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  }

  function normalizeCell(v) {
    if (v == null) return '';
    return String(v).trim();
  }

  // 从 bridge 获取必要的数据函数（只依赖纯函数）
  const {
    cellId,
    splitCellBands,
    joinBands,
    parseCourseToSchedulePlacements,
    weekHintForCell,
    courseCodeFromRow,
    getEnglishNameForIndex,
    byIndex,
    getRenderLang,
    dayLabelForSheet,
    slotLabelForSheet,
    getSlotTimeDisplay,
    loadSlotTimesMap,
    DAYS,
    SLOTS,
  } = window.__tsBridge;

  // 以下函数原本在 legacy.js 中，且未暴露到 bridge，现在复制过来
  function norm(v) { return v == null ? '' : String(v).trim(); }

  function segmentIndexForCellTime(timeFull, dayKey, slotKey) {
    const full = timeFull != null ? String(timeFull).trim() : '';
    if (!full) return -1;
    const parts = full.split(/[;；]/).map(x => toHalfWidthChars(x).trim()).filter(Boolean);
    const scheduleDayMatchLabels = (dk) => {
      const pairs = {
        mon: ['周一', '星期一', 'Monday', 'Mon'],
        tue: ['周二', '星期二', 'Tuesday', 'Tue'],
        wed: ['周三', '星期三', 'Wednesday', 'Wed'],
        thu: ['周四', '星期四', 'Thursday', 'Thu'],
        fri: ['周五', '星期五', 'Friday', 'Fri'],
        sat: ['周六', '星期六', 'Saturday', 'Sat'],
        sun: ['周日', '星期日', '星期天', '周天', 'Sunday', 'Sun'],
      };
      const arr = pairs[dk];
      if (!arr) return [];
      return arr.map(x => x.replace(/\u2013|\u2014|—/g, '-').replace(/\s+/g, ''));
    };
    const slotLessonBounds = (slotKey) => {
      const slot = SLOTS.find(s => s.key === slotKey);
      if (!slot) return null;
      const lab = toHalfWidthChars(slot.label).replace(/\u2013|\u2014|—/g, '-');
      const m = lab.match(/第(\d+)-(\d+)节/);
      if (!m) return null;
      return { lo: parseInt(m[1], 10), hi: parseInt(m[2], 10) };
    };
    const slotSegmentRegex = (slotKey) => {
      const bounds = slotLessonBounds(slotKey);
      if (!bounds) return null;
      const { lo, hi } = bounds;
      const singleList = [];
      for (let n = lo; n <= hi; n++) singleList.push(`第${n}节`);
      const pair = `第${lo}[-、]?${hi}节`;
      return new RegExp(`(?:${pair}|${singleList.join('|')})`);
    };
    const schedulePartMatchesCell = (part, dk, sk) => {
      const day = DAYS.find(d => d.key === dk);
      if (!day || !part) return false;
      const p = toHalfWidthChars(part).replace(/\u2013|\u2014|—/g, '-').replace(/\s+/g, '');
      const labels = scheduleDayMatchLabels(dk);
      if (!labels.some(lab => p.includes(lab))) return false;
      const re = slotSegmentRegex(sk);
      if (!re) return true;
      const raw = String(part).replace(/\u2013|\u2014|—/g, '-');
      return re.test(raw);
    };
    for (let i = 0; i < parts.length; i++) {
      if (schedulePartMatchesCell(parts[i], dayKey, slotKey)) return i;
    }
    return -1;
  }

  function resolveCellTimeDisplay(c, dayKey, slotKey) {
    const full = c.上课时间 != null ? String(c.上课时间).trim() : '';
    const idx = segmentIndexForCellTime(full, dayKey, slotKey);
    if (idx >= 0) {
      const parts = full.split(/[;；]/).map(x => x.trim());
      const one = parts[idx];
      if (one) return one;
    }
    if (full) {
      const n = full.split(/[;；]/).map(x => x.trim()).filter(Boolean).length;
      if (n <= 1 && (() => {
        const p = toHalfWidthChars(full).replace(/\u2013|\u2014|—/g, '-').replace(/\s+/g, '');
        const labels = (() => {
          const pairs = {
            mon: ['周一', '星期一', 'Monday', 'Mon'],
            tue: ['周二', '星期二', 'Tuesday', 'Tue'],
            wed: ['周三', '星期三', 'Wednesday', 'Wed'],
            thu: ['周四', '星期四', 'Thursday', 'Thu'],
            fri: ['周五', '星期五', 'Friday', 'Fri'],
            sat: ['周六', '星期六', 'Saturday', 'Sat'],
            sun: ['周日', '星期日', '星期天', '周天', 'Sunday', 'Sun'],
          };
          return pairs[dayKey] || [];
        })().map(x => x.replace(/\u2013|\u2014|—/g, '-').replace(/\s+/g, ''));
        if (!labels.some(lab => p.includes(lab))) return false;
        const bounds = (() => {
          const slot = SLOTS.find(s => s.key === slotKey);
          if (!slot) return null;
          const lab = toHalfWidthChars(slot.label).replace(/\u2013|\u2014|—/g, '-');
          const m = lab.match(/第(\d+)-(\d+)节/);
          if (!m) return null;
          return { lo: parseInt(m[1], 10), hi: parseInt(m[2], 10) };
        })();
        if (!bounds) return true;
        const re = new RegExp(`第${bounds.lo}[-、]?${bounds.hi}节|第${bounds.lo}节|第${bounds.hi}节`);
        return re.test(full);
      })()) return full;
    }
    // fallback: 显示星期·节次 + 时段
    const day = DAYS.find(d => d.key === dayKey);
    const slot = SLOTS.find(s => s.key === slotKey);
    if (!day || !slot) return '—';
    let line = `${dayLabelForSheet(dayKey)}·${slotLabelForSheet(slotKey)}`;
    const slotTimes = loadSlotTimesMap();
    const slotLine = getSlotTimeDisplay(slotKey, slotTimes);
    if (slotLine && slotLine !== '(xx:xx~xx:xx)') line += ' ' + slotLine;
    return line;
  }

  function resolveCellPlaceDisplay(c, dayKey, slotKey) {
    const placeFull = c.上课地点 != null ? String(c.上课地点).trim() : '';
    if (!placeFull) return '—';
    const timeFull = c.上课时间 != null ? String(c.上课时间).trim() : '';
    const idx = segmentIndexForCellTime(timeFull, dayKey, slotKey);
    const pparts = placeFull.split(/[;；]/).map(x => x.trim()).filter(Boolean);
    if (idx >= 0 && pparts[idx]) return pparts[idx];
    if (pparts.length === 1) return pparts[0];
    const uniq = [...new Set(pparts)];
    if (uniq.length === 1) return uniq[0];
    if (pparts.length > 0) return pparts[0];
    return placeFull;
  }

  function dayPartLeadingCell(slotIndex) {
    const dayParts = window.__tsBridge.trSheet?.('dayParts') || ['上午', '下午', '晚上'];
    const head = window.__tsBridge.trSheet?.('gridDayPartHead') || '时段';
    const escape = escapeHtml;
    if (slotIndex === 0) {
      return `<td class="day-part-cell" rowspan="2" aria-label="${escape(head)}：${escape(dayParts[0])}"><span class="day-part-v">${escape(dayParts[0])}</span></td>`;
    }
    if (slotIndex === 1) return '';
    if (slotIndex === 2) {
      return `<td class="day-part-cell" rowspan="2" aria-label="${escape(head)}：${escape(dayParts[1])}"><span class="day-part-v">${escape(dayParts[1])}</span></td>`;
    }
    if (slotIndex === 3) return '';
    if (slotIndex === 4) {
      return `<td class="day-part-cell" rowspan="2" aria-label="${escape(head)}：${escape(dayParts[2])}"><span class="day-part-v">${escape(dayParts[2])}</span></td>`;
    }
    return '';
  }

  // ========== 模块内部状态 ==========
  let currentGrid = null;
  let currentEnroll = null;
  let currentActiveThirdBands = null;

  // ========== 构建格子 HTML ==========
  function buildCellInnerHtml(cellId, storedValue) {
    const [va, vb, vc] = splitCellBands(storedValue);
    const thirdActive = currentActiveThirdBands?.has(cellId) || Boolean(vc);
    const slotRow =
      '<div class="cell-slot cell-slot--name" data-part="name"></div>' +
      '<div class="cell-slot cell-slot--name-en" data-part="name-en"></div>' +
      '<div class="cell-slot cell-slot--week-hint" data-part="week-hint"></div>' +
      '<div class="cell-slot cell-slot--time" data-part="time"></div>' +
      '<div class="cell-slot cell-slot--place" data-part="place"></div>' +
      '<div class="cell-slot cell-slot--code" data-part="code"></div>';
    const bandHtml = (band, value, placeholder, ariaLabel, hidden) =>
      `<div class="cell-band" data-band="${band}"${hidden ? ' style="display:none"' : ''}>` +
      `<input class="idx-band no-print" type="text" inputmode="numeric" maxlength="4" data-id="${cellId}" data-band="${band}" value="${escapeHtml(value)}" placeholder="${placeholder}" aria-label="${ariaLabel}" />` +
      `<div class="cell-stack">${slotRow}</div>` +
      `</div>`;
    return (
      `<span class="cell-hint no-print" aria-hidden="true">上、中、下三栏可递进填写选课序号</span>` +
      `<div class="cell-display cell--solo-center" data-display="${cellId}" aria-live="polite" data-third-active="${thirdActive ? '1' : '0'}">` +
      `<div class="cell-band-actions no-print">` +
      `<button type="button" class="cell-band-action" data-action="add-band" data-id="${cellId}" aria-label="添加第三门课" title="添加第三门课程（需先填写中栏序号）">+</button>` +
      `<button type="button" class="cell-band-action" data-action="remove-band" data-id="${cellId}" aria-label="移除第三门课" title="移除第三门课程">-</button>` +
      `</div>` +
      `<p class="cell-err-msg" hidden></p>` +
      `<div class="cell-bands">` +
      bandHtml('0', va, '上栏', '上栏选课序号', false) +
      '<div class="cell-band-split" data-split="0" aria-hidden="true" hidden></div>' +
      bandHtml('1', vb, '中栏', '中栏选课序号', true) +
      '<div class="cell-band-split" data-split="1" aria-hidden="true" hidden></div>' +
      bandHtml('2', vc, '下栏', '下栏选课序号', !thirdActive) +
      `</div></div>`
    );
  }

  function populateCellContent(stackRoot, course, dayKey, slotKey) {
    if (!stackRoot || !course) return;
    const set = (part, text) => {
      const el = stackRoot.querySelector(`[data-part="${part}"]`);
      if (el) el.textContent = text;
    };
    const dk = dayKey || '';
    const sk = slotKey || '';
    const cnName = norm(course.课程名称) || '—';
    const rl = getRenderLang();
    const weekHint = dk && sk ? weekHintForCell(course, dk, sk) : '';
    if (rl === 'en') {
      const enName = getEnglishNameForIndex(course.序号) || cnName;
      set('name', enName);
      set('name-en', '');
    } else {
      set('name', cnName);
      set('name-en', '');
    }
    set('week-hint', weekHint || '');

    let timeText = (dk && sk) ? resolveCellTimeDisplay(course, dk, sk) : norm(course.上课时间) || '—';
    const placements = parseCourseToSchedulePlacements(course);
    if (!course.网课 && placements.length === 0) {
      if (timeText && timeText !== '—') {
        timeText += ' [时间解析失败]';
      } else {
        timeText = '[时间解析失败] 请检查上课时间格式';
      }
    }
    set('time', timeText);
    set('place', (dk && sk) ? resolveCellPlaceDisplay(course, dk, sk) : norm(course.上课地点) || '—');
    set('code', courseCodeFromRow(course) || '—');
  }

  function updateCellUI(cellId) {
    const cellEl = document.querySelector(`.cell[data-cell="${cellId}"]`);
    const wrap = cellEl ? cellEl.querySelector(`[data-display="${cellId}"]`) : null;
    if (!cellEl || !wrap) return;
    const storedValue = currentGrid[cellId] ?? '';
    const [va, vb, vc] = splitCellBands(storedValue);
    const inputs = [0, 1, 2].map(band => cellEl.querySelector(`input.idx-band[data-band="${band}"]`));
    const bands = wrap.querySelectorAll('.cell-band');
    const stacks = Array.from(bands).map(b => b.querySelector('.cell-stack'));
    const { dayKey, slotKey } = window.__tsBridge.parseCellId(cellId);

    for (let i = 0; i < 3; i++) {
      const val = [va, vb, vc][i];
      if (val && stacks[i]) {
        const course = byIndex(parseInt(val, 10), currentEnroll.courses);
        if (course) {
          populateCellContent(stacks[i], course, dayKey, slotKey);
        } else if (stacks[i]) {
          stacks[i].innerHTML = '';
        }
      } else if (stacks[i]) {
        stacks[i].innerHTML = '';
      }
    }
    for (let i = 0; i < 3; i++) {
      const inp = inputs[i];
      if (inp) inp.value = [va, vb, vc][i];
    }
    const thirdActive = currentActiveThirdBands?.has(cellId) || Boolean(vc);
    const band2Wrap = cellEl.querySelector('.cell-band[data-band="2"]');
    if (band2Wrap) band2Wrap.style.display = thirdActive ? '' : 'none';
    wrap.dataset.thirdActive = thirdActive ? '1' : '0';
  }

  function renderWeeklyGrid() {
    const table = document.getElementById('schedule-grid');
    if (!table) return;
    const corner = window.__tsBridge.trSheet?.('gridCorner') || '节次 \\ 星期';
    const dph = window.__tsBridge.trSheet?.('gridDayPartHead') || '时段';
    let head = `<thead><tr><th class="day-part-head" scope="col"><span class="day-part-h-label" aria-hidden="true">${escapeHtml(dph)}</span></th><th class="slot-head" scope="col">${escapeHtml(corner)}</th>`;
    for (const day of DAYS) {
      head += `<th scope="col" class="grid-day-col">${escapeHtml(dayLabelForSheet(day.key))}</th>`;
    }
    head += `</tr></thead><tbody>`;

    let body = '';
    for (let slotIdx = 0; slotIdx < SLOTS.length; slotIdx++) {
      const slot = SLOTS[slotIdx];
      const partCell = dayPartLeadingCell(slotIdx);
      let cells = '';
      for (const day of DAYS) {
        const id = cellId(day.key, slot.key);
        const stored = currentGrid[id] ?? '';
        cells += `<td class="grid-day-col"><div class="cell" data-cell="${id}">${buildCellInnerHtml(id, stored)}</div></td>`;
      }
      const slotTimes = loadSlotTimesMap();
      const timeLine = getSlotTimeDisplay(slot.key, slotTimes);
      const timeHtml = timeLine ? `<span class="slot-time">${escapeHtml(timeLine)}</span>` : '';
      const slotLab = slotLabelForSheet(slot.key);
      const thInner = `<span class="th-slot-inner"><span class="slot-label">${escapeHtml(slotLab)}</span>${timeHtml}</span>`;
      body += `<tr>${partCell}<th scope="row">${thInner}</th>${cells}</tr>`;
    }
    body += `</tbody>`;

    table.style.display = 'none';
    table.innerHTML = head + body;
    void table.offsetHeight;
    table.style.display = '';

    for (const day of DAYS) {
      for (const slot of SLOTS) {
        const id = cellId(day.key, slot.key);
        updateCellUI(id);
      }
    }
  }

  function refreshAllCells() {
    for (const day of DAYS) {
      for (const slot of SLOTS) {
        const id = cellId(day.key, slot.key);
        updateCellUI(id);
      }
    }
  }

  function setGridData({ grid, enroll, activeThirdBands }) {
    currentGrid = grid;
    currentEnroll = enroll;
    currentActiveThirdBands = activeThirdBands;
  }

  // 导出到全局
  window.CourseTable = window.CourseTable || {};
  window.CourseTable.grid = {
    render: renderWeeklyGrid,
    refreshAll: refreshAllCells,
    updateCell: updateCellUI,
    setData: setGridData,
  };
})();
