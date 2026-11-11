import { type LayoutProps, SLOT } from '@studiobimo/backstage'

export function DefaultLayout({ slots, children }: LayoutProps) {
  return (
    <>
      {slots[SLOT.header]}
      <main>{children}</main>
      {slots[SLOT.footer]}
    </>
  )
}

export function MinimalLayout({ slots, children }: LayoutProps) {
  return (
    <>
      {slots[SLOT.header]}
      <main>{children}</main>
    </>
  )
}

export function BareLayout({ children }: LayoutProps) {
  return <main>{children}</main>
}
