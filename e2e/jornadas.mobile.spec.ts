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

  test("solicitações: Meus tickets e Rascunhos, filtros e atalho de ajuda", async ({ page }) => {
    await page.goto("/solicitacoes");
    const types = page.getByRole("navigation", { name: "Tipo de lista" });
    await expect(types.getByRole("link", { name: "Meus tickets" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: /#1048 - Atualização cadastral/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Filtros" }).click();
    await page.getByRole("dialog", { name: "Filtrar solicitações" }).getByLabel("Situação").selectOption("aguardando");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page.getByRole("link", { name: /#1036 - Manutenção do ar-condicionado/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /#1048/ })).toHaveCount(0);
    await types.getByRole("link", { name: /Rascunhos/ }).click();
    await expect(page).toHaveURL(/aba=rascunhos/);
    await page.getByRole("link", { name: /Precisa de ajuda\?/ }).click();
    await expect(page).toHaveURL(/\/ajuda$/);
  });

  test("ajuda: atalhos em 4 colunas, 4 artigos e chamada para o chat", async ({ page }) => {
    await page.goto("/ajuda");
    const quick = page.getByRole("region", { name: "Atalhos rápidos" });
    await expect(quick.getByRole("link")).toHaveCount(5); // 4 atalhos + "Ver todos"
    await expect(page.getByRole("region", { name: "Artigos mais acessados" }).getByRole("listitem").filter({ visible: true })).toHaveCount(4);
    await expectNoHorizontalOverflow(page);
    await page.getByRole("link", { name: /Fale com o suporte/ }).last().click();
    await expect(page).toHaveURL(/\/ajuda\/chat$/);
    await expect(page.getByRole("button", { name: "Enviar mensagem" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
