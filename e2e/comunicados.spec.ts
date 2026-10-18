import { sql } from "./support/db";
import { asUser, expect, test } from "./support/fixtures";

/** C — Comunicados: leitura, ciência, não lidos, favoritos, segmentação e estados vazios. */
test.describe("comunicados", () => {
  test.use(asUser("carlos"));

  const unreadBadge = (page: import("@playwright/test").Page) => page.getByRole("link", { name: /Não lidos/ });

  test("abrir um comunicado reduz a contagem de não lidos (persistente)", async ({ page }) => {
    await page.goto("/comunicados");
    const before = Number((await unreadBadge(page).innerText()).match(/\d+/)?.[0] ?? 0);
    const read = page.waitForResponse((r) => r.url().includes("/read") && r.status() === 204);
    await page.getByRole("link", { name: /Campanha de prevenção e segurança/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Campanha de prevenção e segurança" })).toBeVisible();
    await read;
    await page.goto("/comunicados");
    await expect(unreadBadge(page)).toContainText(String(before - 1));
  });

  test("ciência explícita: abrir não confirma; botão confirma e persiste", async ({ page }) => {
    await page.goto("/comunicados?aba=importantes");
    await page.getByRole("link", { name: /Atualização no uso do uniforme/ }).click();
    await expect(page.getByText("Este comunicado exige confirmação de ciência", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Confirmar ciência" }).click();
    await expect(page.getByText("Ciência confirmada").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Você confirmou em/)).toBeVisible();
    const rows = await sql(`select 1 from announcement_acknowledgements k join users u on u.id = k.user_id where u.email = 'carlos.silva@demo.realseg.invalid'`);
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  test("favoritar aparece na aba Favoritos", async ({ page }) => {
    await page.goto("/comunicados");
    await page.getByRole("link", { name: /Novo plano de benefícios/ }).click();
    await page.getByRole("button", { name: "Favoritar" }).click();
    await expect(page.getByRole("button", { name: "Favoritado" })).toBeVisible();
    await page.goto("/comunicados?aba=favoritos");
    await expect(page.getByRole("link", { name: /Novo plano de benefícios/ })).toBeVisible();
  });

  test("anexo do comunicado é baixado com controle de acesso", async ({ page }) => {
    await page.goto("/comunicados?q=uniforme");
    await page.getByRole("link", { name: /Atualização no uso do uniforme/ }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: /orientacoes-uniforme\.pdf/ }).click();
    expect((await download).suggestedFilename()).toBe("orientacoes-uniforme.pdf");
  });

  test("comunicado de outra unidade não é acessível pela URL", async ({ page }) => {
    const [rj] = await sql<{ id: string }>(`select id from announcements where title like 'Mudança de escala%'`);
    await page.goto(`/comunicados/${rj.id}`);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    const api = await page.request.get(`/api/v1/announcements/${rj.id}`);
    expect(api.status()).toBe(404);
  });

  test("busca sem resultados mostra estado vazio com limpeza de filtros", async ({ page }) => {
    await page.goto("/comunicados?q=xyzinexistente");
    await expect(page.getByText("Nenhum comunicado encontrado")).toBeVisible();
    await page.getByRole("link", { name: "Limpar filtros" }).click();
    await expect(page).toHaveURL(/\/comunicados$/);
  });
});
