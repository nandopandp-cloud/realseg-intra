import { asUser, expect, expectNoHorizontalOverflow, test } from "./support/fixtures";

/** B — Home. Usuário: Carlos (com dados) e João (sem dados). */
test.describe("home do colaborador", () => {
  test.use(asUser("carlos"));

  test("boas-vindas, pendências, comunicado importante, solicitações e documentos", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Olá,\s*Carlos!/);
    // Pendências aparecem como selos com texto nos atalhos (como na referência, sem bloco extra)
    const quick = page.getByRole("region", { name: "Acesso rápido" });
    // A contagem exata depende de outras jornadas (ciência confirmada); o selo com texto precisa existir.
    await expect(quick.getByRole("link", { name: /Meus documentos.*\d+ pendentes?/ })).toBeVisible();
    await expect(quick.getByRole("link", { name: /Cursos.*\d+ obrigatórios?/ })).toBeVisible();
    await expect(page.getByText("Manual de vestimentas")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Atualização no uso do uniforme" })).toBeVisible();
    await expect(page.getByRole("link", { name: /#1048 - Atualização cadastral/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Baixar Holerite - Setembro/2026" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("atalhos navegam e a personalização persiste após recarregar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Personalizar" }).click();
    const dialog = page.getByRole("dialog", { name: "Personalizar acesso rápido" });
    await dialog.getByText("Cursos", { exact: true }).click();
    await expect(dialog.getByText("Fale com o RH", { exact: true })).toHaveCount(0); // área oculta (src/lib/features.ts)
    await dialog.getByText("Ajuda e suporte", { exact: true }).click();
    await dialog.getByRole("button", { name: "Salvar atalhos" }).click();
    await expect(page.getByText("Atalhos atualizados.")).toBeVisible();
    await page.reload();
    const quick = page.getByRole("region", { name: "Acesso rápido" });
    await expect(quick.getByRole("link", { name: /Ajuda e suporte/ })).toBeVisible();
    await expect(quick.getByRole("link", { name: /^Cursos/ })).toHaveCount(0);
    await quick.getByRole("link", { name: /Ajuda e suporte/ }).click();
    await expect(page).toHaveURL(/\/ajuda$/);
  });

  test("busca global encontra conteúdo autorizado", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Pesquisar na intranet" }).fill("holerite");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/busca\?q=holerite/);
    await expect(page.getByRole("heading", { name: "Documentos" })).toBeVisible();
    await expect(page.getByRole("link", { name: /#1029 - Solicitação de holerite/ })).toBeVisible();
  });
});

test.describe("home sem dados", () => {
  test.use(asUser("joao"));
  test("estados vazios orientam o próximo passo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Nenhuma solicitação em andamento")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meus documentos recentes" })).toBeVisible();
    await page.getByRole("link", { name: "Nova solicitação" }).click();
    await expect(page).toHaveURL(/\/solicitacoes\/nova/);
  });
});
