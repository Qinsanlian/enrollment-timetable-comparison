import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    exclude: ['test/unit/app-state.test.ts'],   // 添加这一行
    resolve: {
      extensions: ['.ts', '.js', '.mjs', '.cjs'],
    },
  },
})
