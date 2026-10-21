import { asUser, expect, expectAccessible, expectNoHorizontalOverflow, test } from "./support/fixtures";

/** K — Ambiente de gestão (RH): acesso, acessibilidade e jornadas principais. */
const PAGES = ["/rh", "/rh/solicitacoes", "/rh/solicitacoes/1050", "/rh/comunicados", "/rh/comunicados/novo", "/rh/documentos", "/rh/documentos?aba=pessoais", "/rh/documentos?aba=normas", "/rh/documentos/distribuir", "/rh/documentos/distribuir?modo=lote", "/rh/documentos/normas/nova", "/rh/colaboradores", "/rh/colaboradores/novo", "/rh/colaboradores/importar", "/rh/estrutura", "/rh/estrutura?aba=unidades", "/rh/estrutura?aba=cargos", "/rh/cursos", "/rh/cursos?aba=trilhas", "/rh/cursos?aba=categorias", "/rh/cursos/novo", "/rh/carreira", "/rh/carreira?aba=faixas", "/rh/carreira?aba=desenvolvimento", "/rh/carreira/oportunidades/nova", "/rh/feedbacks", "/rh/feedbacks/novo"];

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

  test("colaboradores: cadastrar com senha temporária e o novo colaborador entra", async ({ page, browser }) => {
    await page.goto("/rh/colaboradores/novo");
    await page.getByLabel("Nome completo").fill("Teste E2E Admissão");
    await page.getByLabel("Matrícula").fill("100990");
    await page.getByLabel("E-mail", { exact: true }).fill("teste.e2e@demo.realseg.invalid");
    await page.getByLabel("Cargo").selectOption({ index: 1 });
    await page.getByLabel("Área").selectOption({ index: 1 });
    await page.getByLabel("Unidade").selectOption({ index: 1 });
    await page.getByLabel("Data de admissão").fill("2026-10-01");
    await page.getByRole("button", { name: "Cadastrar colaborador" }).click();
    await expect(page.getByText(/foi cadastrado/)).toBeVisible();
    const password = (await page.locator("code").first().innerText()).trim();
    const ctx = await browser.newContext({ storageState: undefined });
    const p2 = await ctx.newPage();
    await p2.goto("/login");
    await p2.getByLabel("E-mail ou matrícula").fill("100990");
    await p2.getByLabel("Senha", { exact: true }).fill(password);
    await p2.getByRole("button", { name: "Entrar" }).click();
    await expect(p2).toHaveURL(/\/perfil\/seguranca\?obrigatorio=1/);
    await ctx.close();
    await page.getByRole("link", { name: "Ver colaborador" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Teste E2E Admissão" })).toBeVisible();
    await expectAccessible(page);
  });

  test("estrutura: criar uma unidade", async ({ page }) => {
    await page.goto("/rh/estrutura?aba=unidades");
    await page.getByRole("button", { name: "Nova unidade" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome").fill("Unidade Campinas");
    await dialog.getByLabel("Cidade").fill("Campinas");
    await dialog.getByLabel("UF").fill("sp");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("cell", { name: "Unidade Campinas", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Campinas/SP" })).toBeVisible();
  });

  test("cursos: criar, adicionar aula, publicar e aparecer no catálogo do colaborador", async ({ page, browser }) => {
    await page.goto("/rh/cursos/novo");
    await page.getByLabel("Título").fill("Primeiros socorros básicos");
    await page.getByLabel("Resumo").fill("Como agir nos primeiros minutos de uma emergência.");
    await page.getByLabel("Sobre o curso").fill("Curso introdutório de primeiros socorros para todas as equipes.");
    await page.getByLabel("Categoria").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Criar curso" }).click();
    await page.waitForURL(/\/rh\/cursos\/[0-9a-f-]{36}\?aba=conteudo$/);
    await page.getByRole("button", { name: "Adicionar aula" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Título").fill("Avaliação da cena");
    await dialog.getByLabel("Conteúdo").fill("Verifique se o local é seguro antes de se aproximar.");
    await dialog.getByRole("button", { name: "Salvar aula" }).click();
    await expect(page.getByText("1. Avaliação da cena")).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Curso publicado no catálogo.")).toBeVisible();
    await page.getByRole("link", { name: /Participantes/ }).click();
    await expect(page.getByText("Pessoas", { exact: true })).toBeVisible();
    await expectAccessible(page);
    const ctx = await browser.newContext({ storageState: "e2e/.auth/carlos.json" });
    const p2 = await ctx.newPage();
    await p2.goto("/cursos?q=socorros");
    await expect(p2.getByText("Primeiros socorros básicos").first()).toBeVisible();
    await ctx.close();
  });

  test("feedbacks: registrar e publicar; o colaborador lê em Avaliações", async ({ page, browser }) => {
    await page.goto("/rh/feedbacks/novo");
    await page.getByRole("combobox", { name: "Colaborador", exact: true }).fill("João");
    await page.getByRole("option", { name: /João Pereira/ }).click();
    await page.getByLabel("Título").fill("Ótima integração");
    await page.getByLabel("Texto").fill("Parabéns pela dedicação nas primeiras semanas.");
    await page.getByRole("button", { name: "Publicar para o colaborador" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publicar" }).click();
    await page.waitForURL(/\/rh\/feedbacks\/[0-9a-f-]{36}$/);
    await expect(page.getByText("leitura pendente", { exact: false })).toBeVisible();
    await expectAccessible(page);
    const ctx = await browser.newContext({ storageState: "e2e/.auth/joao.json" });
    const p2 = await ctx.newPage();
    await p2.goto("/carreira/avaliacoes");
    await expect(p2.getByText("Ótima integração")).toBeVisible();
    await ctx.close();
  });

  test("carreira: criar e publicar oportunidade interna", async ({ page }) => {
    await page.goto("/rh/carreira/oportunidades/nova");
    await page.getByLabel("Título da vaga").fill("Líder de Turno");
    await page.getByLabel("Área (rótulo)").fill("Operações");
    await page.getByLabel("Descrição").fill("Coordenar a equipe do turno noturno.");
    await page.getByLabel("Requisitos").fill("Experiência com equipes.");
    await page.getByRole("button", { name: "Criar oportunidade" }).click();
    await page.waitForURL(/\/rh\/carreira\/oportunidades\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Publicar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Inscrições abertas")).toBeVisible();
    await expectAccessible(page);
  });
});
