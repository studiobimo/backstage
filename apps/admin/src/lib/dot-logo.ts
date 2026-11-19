export const DOT_LOGO = {
  font: { family: 'Bitcount Prop Double Variable', weight: 400, referenceSize: 300 },
  grid: { gap: 3.3, dotRadius: 0.95, alphaThreshold: 120 },
  size: { minWidth: 240, maxWidth: 520, fallbackAspect: 5.5 },
  pixelRatioCap: 2,
  twinkle: {
    baseAlpha: 0.7,
    baseAlphaSpread: 0.25,
    amplitude: 0.1,
    amplitudeSpread: 0.2,
    minSpeed: 1.6,
    speedSpread: 3.4
  },
  sparkle: {
    lifeSeconds: 0.32,
    spawnShare: 0.014,
    alphaBoost: 0.6,
    radiusBoost: 0.55,
    frameSeconds: 1 / 60
  },
  fullCircle: Math.PI * 2
} as const

export interface Dot {
  x: number
  y: number
  phase: number
  speed: number
  base: number
  amp: number
}

export interface TextMetrics {
  aspect: number
  ascent: number
  descent: number
}

const fontSpec = (size: number) => `${DOT_LOGO.font.weight} ${size}px "${DOT_LOGO.font.family}"`

export function measureWordmark(ctx: CanvasRenderingContext2D, text: string): TextMetrics {
  const { referenceSize } = DOT_LOGO.font
  ctx.font = fontSpec(referenceSize)
  const metrics = ctx.measureText(text)
  const ascent = metrics.actualBoundingBoxAscent || referenceSize * 0.8
  const descent = metrics.actualBoundingBoxDescent || referenceSize * 0.22
  const aspect =
    metrics.width > 0 ? metrics.width / (ascent + descent) : DOT_LOGO.size.fallbackAspect
  return { aspect, ascent, descent }
}

export function rasterizeWordmark(
  text: string,
  metrics: TextMetrics,
  width: number,
  height: number
): ImageData | null {
  const surface = document.createElement('canvas')
  surface.width = width
  surface.height = height
  const ctx = surface.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const scale = height / (metrics.ascent + metrics.descent)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = fontSpec(DOT_LOGO.font.referenceSize * scale)
  ctx.fillText(text, width / 2, metrics.ascent * scale)
  return ctx.getImageData(0, 0, width, height)
}

const randomDot = (x: number, y: number): Dot => {
  const { twinkle } = DOT_LOGO
  return {
    x: Math.round(x) + 0.5,
    y: Math.round(y) + 0.5,
    phase: Math.random() * DOT_LOGO.fullCircle,
    speed: twinkle.minSpeed + Math.random() * twinkle.speedSpread,
    base: twinkle.baseAlpha + Math.random() * twinkle.baseAlphaSpread,
    amp: twinkle.amplitude + Math.random() * twinkle.amplitudeSpread
  }
}

export function sampleDots(image: ImageData, cssWidth: number, cssHeight: number): Dot[] {
  const { gap, alphaThreshold } = DOT_LOGO.grid
  const ratio = image.width / cssWidth
  const alphaChannel = 3
  const channels = 4
  const dots: Dot[] = []
  for (let y = gap / 2; y < cssHeight; y += gap) {
    for (let x = gap / 2; x < cssWidth; x += gap) {
      const column = Math.min(image.width - 1, Math.floor(x * ratio))
      const row = Math.min(image.height - 1, Math.floor(y * ratio))
      const alpha = image.data[(row * image.width + column) * channels + alphaChannel]
      if (alpha > alphaThreshold) dots.push(randomDot(x, y))
    }
  }
  return dots
}

export function fitWordmark(containerWidth: number, aspect: number) {
  const { minWidth, maxWidth } = DOT_LOGO.size
  const width = Math.max(minWidth, Math.min(maxWidth, containerWidth))
  return { width, height: width / aspect }
}

export function drawDots(
  ctx: CanvasRenderingContext2D,
  dots: Dot[],
  sparkle: Float32Array,
  seconds: number,
  color: string,
  animate: boolean
) {
  const { dotRadius } = DOT_LOGO.grid
  const { sparkle: spark } = DOT_LOGO
  if (animate) {
    const spawns = Math.max(1, Math.round(dots.length * spark.spawnShare))
    for (let i = 0; i < spawns; i++) {
      const index = Math.floor(Math.random() * dots.length)
      if (sparkle[index] <= 0) sparkle[index] = spark.lifeSeconds
    }
  }
  dots.forEach((dot, index) => {
    let alpha = animate ? dot.base + dot.amp * Math.sin(seconds * dot.speed + dot.phase) : dot.base
    let radius = dotRadius
    if (sparkle[index] > 0) {
      const life = sparkle[index] / spark.lifeSeconds
      alpha = Math.min(1, alpha + life * spark.alphaBoost)
      radius = dotRadius * (1 + life * spark.radiusBoost)
      sparkle[index] -= spark.frameSeconds
    }
    ctx.globalAlpha = Math.min(1, Math.max(0, alpha))
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(dot.x, dot.y, radius, 0, DOT_LOGO.fullCircle)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}
