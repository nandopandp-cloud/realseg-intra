// Utilitário de desenvolvimento: capturas desktop (1536x1024) e mobile (390x844). Uso: node scripts/dev/screenshot.mjs <prefixo> <rota...>
import { chromium } from "@playwright/test";
const [,, prefix, ...paths] = process.argv;
const OUT = process.env.OUT_DIR ?? ".data/screenshots/";
const base = process.env.BASE ?? "http://localhost:3000";
import fs from "node:fs";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const modes = (process.env.MODES ?? "desktop,mobile").split(",");
for (const mode of modes) {
  const ctx = await browser.newContext(mode === "desktop" ? { viewport: { width: 1536, height: 1024 } } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
  if (process.env.NOLOGIN !== "1") {
    await page.goto(base + "/login");
    await page.getByLabel("E-mail ou matrícula").fill(process.env.USER_ID ?? "100231");
    await page.getByLabel("Senha", { exact: true }).fill("Realseg@2026");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 });
  }
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    const name = `${prefix}-${p.replace(/[^a-z0-9]+/gi, "_") || "home"}-${mode}.png`;
    await page.screenshot({ path: OUT + name, fullPage: process.env.FULL === "1" });
    const vw = page.viewportSize().width;
    const overflow = await page.evaluate((w) => document.documentElement.scrollWidth > w + 1, vw);
    console.log("saved", name, overflow ? "HORIZONTAL-OVERFLOW" : "");
  }
  await ctx.close();
}
await browser.close();
