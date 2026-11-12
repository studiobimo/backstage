import { expect, test as base } from '@playwright/test'

const reportSecurityPolicyViolations = () => {
  document.addEventListener('securitypolicyviolation', (event) => {
    console.error(
      `securitypolicyviolation: ${event.violatedDirective} blocked ${event.blockedURI || 'inline'} on ${event.documentURI}`
    )
  })
}

export const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      await page.addInitScript(reportSecurityPolicyViolations)
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', (error) => errors.push(error.message))
      await use(errors)
      expect(errors, 'the browser reported errors').toEqual([])
    },
    { auto: true }
  ]
})

export { expect }
