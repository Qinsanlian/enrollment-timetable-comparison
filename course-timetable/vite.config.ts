import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 1024 * 1024, // 所有资源（JS/CSS/图片）内联到 HTML，无需外部文件
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // 单文件输出，不分 chunk
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
})
