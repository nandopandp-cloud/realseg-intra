import { asUser, expect, expectAccessible, expectNoHorizontalOverflow, test } from "./support/fixtures";

/** L — Acessibilidade (axe WCAG 2.2 A/AA) e responsividade em desktop e mobile (somente leitura). */
const PAGES = [
  "/",
  "/comunicados",
  "/documentos",
  "/documentos/enviar",
  "/documentos/normas",
  "/documentos/historico",
  "/solicitacoes",
  "/solicitacoes/nova",
  "/solicitacoes/1048",
  "/cursos",
  "/cursos/boas-praticas-de-seguranca",
  "/carreira",
  "/carreira/cargos",
  "/carreira/avaliacoes",
  "/ajuda",
  "/ajuda/artigos/esqueci-minha-senha",
  "/notificacoes",
  "/perfil",
  "/perfil/seguranca",
];

test.describe("acessibilidade e responsividade", () => {
  test.use(asUser("carlos"));
  for (const path of PAGES) {
    test(`${path} sem violações automáticas e sem rolagem horizontal`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main#conteudo")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectAccessible(page);
    });
  }

  test("login acessível", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto("/login");
    await expectAccessible(page);
    await expectNoHorizontalOverflow(page);
    await ctx.close();
  });

  test("teclado: link 'Pular para o conteúdo' e foco visível", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);
  });
});
