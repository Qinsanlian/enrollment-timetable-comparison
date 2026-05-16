import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    resolve: {
      alias: {
        '@src': path.resolve(__dirname, 'course-timetable/src'),
      },
    },
  },
})
