// Utilitário de desenvolvimento: percorre links internos autenticado e aponta erros, status != 200 e overflow horizontal.
// Uso: node scripts/dev/crawl.mjs [baseUrl]   (requer servidor rodando e dados de demonstração)
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const problems = [];
for (const mode of ["desktop", "mobile"]) {
  const ctx = await browser.newContext(mode === "desktop" ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  await page.goto(base + "/login");
  await page.locator("input[name=identifier]").fill("100231");
  await page.locator("input[name=password]").fill("Realseg@2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  const seen = new Set();
  const queue = ["/"];
  while (queue.length && seen.size < 90) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    errors.length = 0;
    const res = await page.goto(base + path, { waitUntil: "networkidle" }).catch((e) => ({ status: () => 0, e }));
    const status = res?.status?.() ?? 0;
    const vw = page.viewportSize().width;
    const overflow = await page.evaluate((w) => document.documentElement.scrollWidth > w + 1, vw);
    if (status !== 200 || overflow || errors.length) problems.push({ mode, path, status, overflow, errors: [...errors] });
    const links = await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")));
    for (const l of links) {
      const clean = l.split("#")[0];
      if (!clean || clean.startsWith("/api/") || seen.has(clean)) continue;
      // limita variações de query para não explodir
      if (clean.includes("?") && [...seen].filter((s) => s.split("?")[0] === clean.split("?")[0]).length > 3) continue;
      queue.push(clean);
    }
  }
  console.log(`${mode}: ${seen.size} páginas visitadas`);
  await ctx.close();
}
await browser.close();
if (problems.length) {
  console.log(JSON.stringify(problems, null, 1));
  process.exitCode = 1;
} else console.log("Nenhum problema encontrado.");
