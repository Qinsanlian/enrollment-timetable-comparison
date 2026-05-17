// src/utils.js
export function splitCellBands(cellValue) {
  const t = String(cellValue ?? "").trim();
  if (!t) return ["", "", ""];
  if (t.includes("|")) {
    const r = t.split("|");
    return [
      String(r[0] == null ? "" : r[0]).trim(),
      String(r[1] == null ? "" : r[1]).trim(),
      String(r[2] == null ? "" : r[2]).trim()
    ];
  }
  const n = parseNumbers(t);
  if (n.length >= 3) return [String(n[0]), String(n[1]), String(n[2])];
  if (n.length === 2) return [String(n[0]), String(n[1]), ""];
  if (n.length === 1) return [String(n[0]), "", ""];
  return ["", "", ""];
}

function parseNumbers(str) {
  const parts = str.split(/\s+/);
  const nums = [];
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (Number.isFinite(num) && num >= 1) nums.push(num);
  }
  return nums;
}
