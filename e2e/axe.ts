import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page } from '@playwright/test'

import { expect } from './fixtures'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

export const settled = (locator: Locator) =>
  locator.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map(({ finished }) => finished))
  )

export async function expectNoAxeViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const summary = violations.map(({ id, help, nodes }) => ({
    id,
    help,
    nodes: nodes.map(({ target, html }) => ({ target: target.join(' '), html }))
  }))
  expect(summary, `axe violations on ${where}`).toEqual([])
}
