import type { Course, GridModel } from '../types'
import { joinBands, splitCellBands, parseBandToken } from '../utils/helpers'
import { parseCourseToSchedulePlacements } from './schedule-parser'

export function computeAutofill(courses: Course[], currentGrid: GridModel): {
  newGrid: GridModel
  filled: number
  skipped: number
  newActiveThirdBands: Set<string>
} {
  const nextGrid: GridModel = { ...currentGrid }
  let filled = 0
  let skipped = 0
  const newActiveThirdBands = new Set<string>()

  for (const course of courses) {
    if (course.网课) continue
    const idxNum = Number(course.序号)
    if (!Number.isFinite(idxNum) || idxNum < 1) continue
    const idxStr = String(idxNum)
    const placements = parseCourseToSchedulePlacements(course)
    for (const { dayKey, slotKey } of placements) {
      const cellId = `${dayKey}-${slotKey}`
      const cur = nextGrid[cellId] ?? ''
      const [a0, b0, c0] = splitCellBands(cur)
      const existingNums = [a0, b0, c0].map(v => parseBandToken(v)).filter(n => n !== null && Number.isFinite(n))

      if (existingNums.includes(idxNum)) {
        skipped++
        continue
      }

      // 规则：按顺序填 a → b → c
      if (!a0) {
        nextGrid[cellId] = joinBands(idxStr, b0, c0)
        filled++
      } else if (!b0) {
        nextGrid[cellId] = joinBands(a0, idxStr, c0)
        filled++
      } else if (!c0) {
        nextGrid[cellId] = joinBands(a0, b0, idxStr)
        newActiveThirdBands.add(cellId)
        filled++
      } else {
        skipped++  // 三栏已满，跳过
      }
    }
  }

  return { newGrid: nextGrid, filled, skipped, newActiveThirdBands }
}
