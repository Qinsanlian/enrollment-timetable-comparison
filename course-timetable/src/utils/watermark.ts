/**
 * watermark.ts — 图片水印处理模块
 *
 * 功能：将用户上传的彩色图片转换为半透明水印，叠加到 A3 页面 Canvas 上。
 * 处理策略：降低饱和度 + 降低全局透明度，保留原彩色调，不影响阅读。
 */

export interface WatermarkOptions {
  /** 水印透明度 (0 ~ 1)，默认 0.08 */
  opacity?: number
  /**
   * 饱和度调整量 (-1 ~ 0)，默认 -0.6。
   * 实际传给 CSS saturate() 的值为 (1 + saturation)，即 0.4。
   * 负值降低饱和度，0 保持原色，正值增强饱和度。
   */
  saturation?: number
  /** 水印宽度占画布宽度的比例，默认 0.25 (即 1/4) */
  sizeRatio?: number
}

/**
 * 将图片处理为水印效果，并绘制到目标 Canvas 上（水平垂直居中）。
 *
 * @param targetCanvas - 目标画布（通常是 A3 页面的 Canvas）
 * @param imageSource  - 用户上传的图片（HTMLImageElement 或 URL 字符串）
 * @param options      - 水印配置选项
 *
 * @example
 * const a3Canvas = await captureSheetCanvas('zh');
 * const img = document.getElementById('watermark-image') as HTMLImageElement;
 * await applyWatermark(a3Canvas, img, { opacity: 0.08, saturation: -0.6, sizeRatio: 0.25 });
 */
export async function applyWatermark(
  targetCanvas: HTMLCanvasElement,
  imageSource: HTMLImageElement | string,
  options: WatermarkOptions = {}
): Promise<void> {
  const {
    opacity = 0.15,
    saturation = -0.3,
    sizeRatio = 0.25,
  } = options

  // 1. 获取图像元素
  const image = await loadImage(imageSource)

  // 2. 计算水印尺寸：保持原图宽高比，宽度为画布宽度的 sizeRatio
  const maxW = Math.floor(targetCanvas.width * sizeRatio)
  const aspect = image.naturalWidth > 0 && image.naturalHeight > 0
    ? image.naturalWidth / image.naturalHeight
    : 1
  const wmW = maxW
  const wmH = Math.floor(maxW / aspect)

  // 3. 创建离屏 Canvas 处理水印效果
  const offscreen = document.createElement('canvas')
  offscreen.width = wmW
  offscreen.height = wmH
  const ctx = offscreen.getContext('2d')
  if (!ctx) {
    console.error('[Watermark] 无法获取离屏 Canvas 2D 上下文')
    return
  }

  // 4. 将原始图片绘制到离屏 Canvas，并应用饱和度滤镜
  //    CSS saturate() 接受 0~∞，不接受负值，所以用 (1 + saturation)
  const saturateVal = Math.max(0, 1 + saturation)
  ctx.filter = `saturate(${saturateVal})`
  ctx.drawImage(image, 0, 0, wmW, wmH)

  // 5. 将处理后的水印叠加到目标 Canvas 上
  const targetCtx = targetCanvas.getContext('2d')
  if (!targetCtx) {
    console.error('[Watermark] 无法获取目标 Canvas 2D 上下文')
    return
  }

  // 6. 计算水平垂直居中位置
  const x = Math.floor((targetCanvas.width - wmW) / 2)
  const y = Math.floor((targetCanvas.height - wmH) / 2)

  // 7. 设置全局透明度并绘制
  const prevAlpha = targetCtx.globalAlpha
  targetCtx.globalAlpha = Math.max(0, Math.min(1, opacity))
  targetCtx.drawImage(offscreen, x, y, wmW, wmH)

  // 8. 恢复全局透明度，避免影响后续绘制
  targetCtx.globalAlpha = prevAlpha
}

/**
 * 从图片源加载 HTMLImageElement，确保图片已完全加载。
 */
async function loadImage(source: HTMLImageElement | string): Promise<HTMLImageElement> {
  if (source instanceof HTMLImageElement) {
    if (source.complete && source.naturalWidth > 0) return source
    return new Promise((resolve, reject) => {
      source.onload = () => resolve(source)
      source.onerror = () => reject(new Error('图片加载失败'))
    })
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`无法加载图片: ${source}`))
    img.src = source
  })
}
