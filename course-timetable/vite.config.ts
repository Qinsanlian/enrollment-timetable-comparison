import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  define: {
    // 替换 import.meta.url，使内联脚本在 file:// 下也能运行
    'import.meta.url': JSON.stringify(''),
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
})
