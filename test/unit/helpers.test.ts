import { describe, it, expect } from 'vitest'
import { splitCellBands, joinBands, parseBandToken } from '../../course-timetable/src/utils/helpers'

describe('splitCellBands', () => {
  it('正确拆分 "1|2|3"', () => {
    expect(splitCellBands('1|2|3')).toEqual(['1', '2', '3'])
  })

  it('正确拆分 "1" 为 ["1","",""]', () => {
    expect(splitCellBands('1')).toEqual(['1', '', ''])
  })

  it('空字符串返回 ["","",""]', () => {
    expect(splitCellBands('')).toEqual(['', '', ''])
  })

  it('兼容空格分隔 "1 2 3"', () => {
    expect(splitCellBands('1 2 3')).toEqual(['1', '2', '3'])
  })
})

describe('joinBands', () => {
  it('合并 "1","2","3" 为 "1|2|3"', () => {
    expect(joinBands('1', '2', '3')).toBe('1|2|3')
  })

  it('合并 "1","","" 为 "1"', () => {
    expect(joinBands('1', '', '')).toBe('1')
  })

  it('全空返回空字符串', () => {
    expect(joinBands('', '', '')).toBe('')
  })
})

describe('parseBandToken', () => {
  it('解析 "12" 为 12', () => {
    expect(parseBandToken('12')).toBe(12)
  })

  it('空字符串返回 null', () => {
    expect(parseBandToken('')).toBe(null)
  })

  it('非数字返回 NaN', () => {
    expect(parseBandToken('abc')).toBeNaN()
  })
})
