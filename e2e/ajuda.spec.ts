import { asUser, expect, test } from "./support/fixtures";

/** J — Ajuda: busca, artigos, vínculo com solicitações e estados sem resultado. */
test.describe("ajuda e suporte", () => {
  test.use(asUser("carlos"));

  test("busca encontra artigo e o voto é registrado", async ({ page }) => {
    await page.goto("/ajuda");
    await expect(page.getByText("Horário de atendimento")).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar na central de ajuda" }).fill("senha");
    await page.keyboard.press("Enter");
    await page.getByRole("link", { name: /Esqueci minha senha/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Esqueci minha senha. E agora?" })).toBeVisible();
    await page.getByRole("button", { name: "Sim" }).click();
    await expect(page.getByText("Obrigado pelo retorno!")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Sim" })).toHaveAttribute("aria-pressed", "true");
  });

  test("artigo leva à abertura de solicitação já na categoria certa", async ({ page }) => {
    await page.goto("/ajuda/artigos/como-registrar-o-ponto");
    await page.getByRole("link", { name: "Abrir solicitação" }).click();
    await expect(page).toHaveURL(/\/solicitacoes\/nova\?categoria=rh/);
    await expect(page.getByRole("radio", { name: /^RH/ })).toBeChecked();
  });

  test("busca sem resultados oferece contato com o suporte", async ({ page }) => {
    await page.goto("/ajuda?q=xyzinexistente");
    await expect(page.getByText("Não encontramos artigos para essa busca")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir uma solicitação" }).first()).toBeVisible();
  });

  test("categorias listam artigos publicados", async ({ page }) => {
    await page.goto("/ajuda");
    await page.getByRole("link", { name: /Sistemas e acesso/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sistemas e acesso" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Como acessar a intranet pela primeira vez/ })).toBeVisible();
  });
});
