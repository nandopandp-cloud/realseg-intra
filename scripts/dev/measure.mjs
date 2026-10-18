// Utilitário de desenvolvimento: mede requisições e bytes de uma sessão típica (login → Home → Comunicados → Documentos).
// Uso: node scripts/dev/measure.mjs [baseUrl]   (requer `pnpm build && pnpm start` e dados de demonstração)
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const stats = { total: 0, bytes: 0, servidor: 0, prefetchServidor: 0, estaticos: 0, imagensOtimizadas: 0, api: 0 };
page.on("requestfinished", async (req) => {
  const url = new URL(req.url());
  if (url.origin !== new URL(base).origin) return;
  stats.total++;
  const size = (await req.sizes().catch(() => null))?.responseBodySize ?? 0;
  stats.bytes += size;
  const h = req.headers();
  if (url.pathname.startsWith("/_next/image")) stats.imagensOtimizadas++;
  else if (url.pathname.startsWith("/_next/static") || /\.(png|jpe?g|webp|svg|woff2?|ico)$/.test(url.pathname)) stats.estaticos++;
  else if (url.pathname.startsWith("/api/")) stats.api++;
  else if (h["next-router-prefetch"] || h["purpose"] === "prefetch") stats.prefetchServidor++;
  else stats.servidor++;
});
await page.goto(base + "/login");
await page.locator("input[name=identifier]").fill("100231");
await page.locator("input[name=password]").fill(process.env.DEMO_PASSWORD ?? "Realseg@2026");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/login"));
await page.waitForTimeout(2500);
for (const label of ["Comunicados", "Documentos"]) {
  await page.getByRole("navigation", { name: "Seções" }).getByRole("link", { name: label }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
}
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log(JSON.stringify({ ...stats, kb: Math.round(stats.bytes / 1024) }));
await browser.close();
