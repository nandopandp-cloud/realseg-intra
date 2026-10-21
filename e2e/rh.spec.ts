import { asUser, expect, expectAccessible, expectNoHorizontalOverflow, test } from "./support/fixtures";

/** K — Ambiente de gestão (RH): acesso, acessibilidade e jornadas principais. */
const PAGES = ["/rh", "/rh/solicitacoes", "/rh/solicitacoes/1050", "/rh/comunicados", "/rh/comunicados/novo", "/rh/documentos", "/rh/documentos?aba=pessoais", "/rh/documentos?aba=normas", "/rh/documentos/distribuir", "/rh/documentos/distribuir?modo=lote", "/rh/documentos/normas/nova"];

test.describe("gestão — acesso", () => {
  test.use(asUser("carlos"));
  test("colaborador não acessa a gestão (404) nem vê o atalho", async ({ page }) => {
    const res = await page.goto("/rh");
    expect(res?.status()).toBe(404);
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu da conta" }).click();
    await expect(page.getByRole("link", { name: "Painel de gestão" })).toHaveCount(0);
  });
});

test.describe("gestão — acessibilidade", () => {
  test.use(asUser("mariana"));
  for (const path of PAGES) {
    test(`${path} sem violações automáticas e sem rolagem horizontal`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main#conteudo")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectAccessible(page);
    });
  }
});

test.describe("gestão — jornadas", () => {
  test.use(asUser("mariana"));

  test("atalho entre áreas e painel com indicadores", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu da conta" }).click();
    await page.getByRole("link", { name: "Painel de gestão" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Olá");
    await expect(page.getByText("Solicitações abertas")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Seções" }).getByRole("link", { name: "Comunicados" })).toBeVisible();
  });

  test("atendimento: assumir, responder e pedir retorno ao colaborador", async ({ page }) => {
    await page.goto("/rh/solicitacoes?aba=sem-responsavel");
    await page.getByRole("link", { name: "#1050" }).click();
    await page.getByRole("button", { name: "Assumir solicitação" }).click();
    await expect(page.getByText("A solicitação agora está com você.")).toBeVisible();
    await page.getByRole("radio", { name: "Nota interna" }).click();
    await page.getByRole("textbox", { name: "Mensagem" }).fill("Conferir com a folha antes de responder.");
    await page.getByRole("button", { name: "Registrar nota" }).click();
    await expect(page.getByText("Visível só para a equipe")).toBeVisible();
    await page.getByRole("radio", { name: "Resposta" }).click();
    await page.getByRole("textbox", { name: "Mensagem" }).fill("Olá, Ana! Pode confirmar o período da alteração?");
    await page.getByLabel("Depois de enviar, mudar a situação para").selectOption({ label: "Aguardando colaborador" });
    await page.getByRole("button", { name: "Enviar resposta" }).click();
    await expect(page.getByText("Resposta enviada ao colaborador.")).toBeVisible();
    await expect(page.getByText("Prazo pausado: aguardando o colaborador")).toBeVisible();
  });

  test("comunicado: criar, publicar para uma unidade e ver o relatório", async ({ page, browser }) => {
    await page.goto("/rh/comunicados/novo");
    await page.getByLabel("Título").fill("Simulado de evacuação no RJ");
    await page.getByLabel("Resumo").fill("Participe do simulado na próxima semana.");
    await page.getByRole("textbox", { name: "Texto do comunicado" }).fill("O simulado acontece na quinta-feira.\n\n- Siga a brigada\n- Use a saída de emergência");
    await page.getByLabel("Categoria").selectOption({ label: "Segurança" });
    await page.getByRole("radio", { name: /Público específico/ }).check();
    await page.getByRole("tab", { name: "Unidades" }).click();
    await page.getByRole("checkbox", { name: /Unidade Rio de Janeiro/ }).check();
    await page.getByRole("button", { name: "Criar rascunho" }).click();
    await page.waitForURL(/\/rh\/comunicados\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publicar agora" }).click();
    await expect(page.getByText(/Publicado em/)).toBeVisible();
    await page.getByRole("link", { name: "Relatório de leitura" }).click();
    await expect(page.getByText("Pessoas no público")).toBeVisible();
    await expect(page.getByRole("cell", { name: /Ana Souza/ })).toBeVisible();
    // Ana (Rio de Janeiro) vê; Carlos (São Paulo) não.
    const ana = await browser.newContext({ storageState: "e2e/.auth/ana.json" });
    const anaPage = await ana.newPage();
    await anaPage.goto("/comunicados");
    await expect(anaPage.getByRole("link", { name: /Simulado de evacuação no RJ/ }).first()).toBeVisible();
    await ana.close();
  });

  test("documentos: aceitar um envio do colaborador", async ({ page }) => {
    await page.goto("/rh/documentos");
    await page.locator('a[href^="/rh/documentos/envios/"]').first().click();
    await page.getByRole("button", { name: "Aceitar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aceitar" }).click();
    await expect(page.getByText("Envio aceito. O colaborador foi avisado.")).toBeVisible();
    await expect(page.getByText("Aceito").first()).toBeVisible();
  });
});
