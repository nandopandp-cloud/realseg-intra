import { asUser, expect, expectNoHorizontalOverflow, test } from "./support/fixtures";

/** Jornadas do colaborador no celular, conforme as referências mobile (resumos, "Ver todos", atalhos). */
test.describe("jornadas no celular", () => {
  test.use(asUser("carlos"));

  test("documentos: resumo com 4 recentes, Ver todos com lista completa e card de envio", async ({ page }) => {
    await page.goto("/documentos");
    const recent = page.getByRole("region", { name: "Meus documentos" }).filter({ has: page.getByRole("link", { name: /Ver todos/ }) });
    await expect(recent.getByRole("link", { name: "Baixar Holerite - Setembro/2026" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Documentos importantes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voltar para o início" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: /Ver todos/ }).first().click();
    await expect(page).toHaveURL(/todos=1/);
    await expect(page.getByText(/Mostrando 8 de 15 documentos/)).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Buscar documento" })).toBeVisible();
    await page.getByRole("link", { name: "Resumo de documentos" }).click();
    await expect(page).toHaveURL(/\/documentos$/);

    await page.getByRole("link", { name: /Enviar documento Envie atestados/ }).click();
    await expect(page).toHaveURL(/\/documentos\/enviar$/);
    await expect(page.getByText("Escolha uma opção:", { exact: true })).toBeVisible();
  });
});
