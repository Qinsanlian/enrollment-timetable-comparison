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

  describe('存储格式兼容性', () => {
    it('应能正确解析旧格式 "99|18" 和 "99"', () => {
      const cases = [
        { input: '99|18', expected: { top: '99', middle: '18', bottom: '' } },
        { input: '99', expected: { top: '99', middle: '', bottom: '' } },
        { input: '99|18|7', expected: { top: '99', middle: '18', bottom: '7' } },
        { input: '99|18|', expected: { top: '99', middle: '18', bottom: '' } }, // 尾部空栏
      ]
      for (const { input, expected } of cases) {
        const [top, middle, bottom] = splitCellBands(input)
        expect({ top, middle, bottom }).toEqual(expected)
      }
    })
  
    it('joinBands 和 splitCellBands 应可逆', () => {
      const testCases = [
        { top: '12', middle: '', bottom: '' },
        { top: '12', middle: '34', bottom: '' },
        { top: '12', middle: '34', bottom: '56' },
      ]
      for (const { top, middle, bottom } of testCases) {
        const joined = joinBands(top, middle, bottom)
        const [t, m, b] = splitCellBands(joined)
        expect(t).toBe(top)
        expect(m).toBe(middle)
        expect(b).toBe(bottom)
      }
    })
  })
})
