import type { ReactNode } from 'react'

interface SectionFrameProps {
  id: string
  title: string
  description?: string
  icon: ReactNode
  children: ReactNode
}

export function SectionFrame({ id, title, description, icon, children }: SectionFrameProps) {
  return (
    <section
      aria-labelledby={`section-${id}`}
      className="grid gap-6 border-t pt-10 first:border-t-0 first:pt-0 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-12"
    >
      <header className="flex items-start gap-4 xl:flex-col xl:gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs/5 [&_svg]:size-5"
        >
          {icon}
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 id={`section-${id}`} className="text-xl">
            {title}
          </h2>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
      </header>
      <div className="flex min-w-0 flex-col gap-8">{children}</div>
    </section>
  )
}
