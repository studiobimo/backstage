import { BRAND_MARK, brandMarkDots, brandMarkViewBox } from '@/lib/brand-mark'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={brandMarkViewBox()}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {brandMarkDots().map((dot) => (
        <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r={BRAND_MARK.dotRadiusRatio} />
      ))}
    </svg>
  )
}
