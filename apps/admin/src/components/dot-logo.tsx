import { useEffect, useRef } from 'react'

import {
  DOT_LOGO,
  type Dot,
  drawDots,
  fitWordmark,
  measureWordmark,
  rasterizeWordmark,
  sampleDots
} from '@/lib/dot-logo'
import { cn } from '@/lib/utils'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const MILLISECONDS_PER_SECOND = 1000

interface DotLogoProps {
  text: string
  className?: string
}

function startWordmark(wrap: HTMLElement, canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const animate = !window.matchMedia(REDUCED_MOTION_QUERY).matches
  let dots: Dot[] = []
  let sparkle = new Float32Array(0)
  let frame = 0
  let disposed = false
  let metrics = measureWordmark(ctx, text)
  const startedAt = performance.now()

  const render = (now: number) => {
    const ratio = Math.min(window.devicePixelRatio || 1, DOT_LOGO.pixelRatioCap)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawDots(
      ctx,
      dots,
      sparkle,
      (now - startedAt) / MILLISECONDS_PER_SECOND,
      getComputedStyle(canvas).color,
      animate
    )
    if (animate && !disposed) frame = requestAnimationFrame(render)
  }

  const layout = () => {
    const size = fitWordmark(wrap.clientWidth, metrics.aspect)
    const ratio = Math.min(window.devicePixelRatio || 1, DOT_LOGO.pixelRatioCap)
    canvas.width = Math.round(size.width * ratio)
    canvas.height = Math.round(size.height * ratio)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    const image = rasterizeWordmark(text, metrics, canvas.width, canvas.height)
    dots = image ? sampleDots(image, size.width, size.height) : []
    sparkle = new Float32Array(dots.length)
    cancelAnimationFrame(frame)
    render(performance.now())
  }

  const observer = new ResizeObserver(layout)
  void document.fonts
    .load(
      `${DOT_LOGO.font.weight} ${DOT_LOGO.font.referenceSize}px "${DOT_LOGO.font.family}"`,
      text
    )
    .catch(() => null)
    .then(() => {
      if (disposed) return
      metrics = measureWordmark(ctx, text)
      layout()
      observer.observe(wrap)
    })

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    observer.disconnect()
  }
}

export function DotLogo({ text, className }: DotLogoProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    return startWordmark(wrap, canvas, text)
  }, [text])

  return (
    <div ref={wrapRef} className={cn('flex w-full', className)}>
      <canvas ref={canvasRef} aria-hidden="true" className="block text-foreground" />
    </div>
  )
}
