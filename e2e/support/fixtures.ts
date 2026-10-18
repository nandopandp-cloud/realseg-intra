import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { authFile, type UserKey } from "./users";

export const asUser = (u: UserKey) => ({ storageState: authFile(u) });

/** Verificação automatizada WCAG 2.2 A/AA (complementa revisão manual). */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nó(s) — ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, summary.join("\n")).toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

export const test = base;
export { expect };
