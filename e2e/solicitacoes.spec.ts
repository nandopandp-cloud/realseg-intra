import path from "node:path";
import fs from "node:fs";
import { asUser, expect, test } from "./support/fixtures";

/** F — Solicitações e SLA. */
test.describe("solicitações", () => {
  test.use(asUser("carlos"));
  test.beforeAll(() => {
    fs.mkdirSync("e2e/fixtures", { recursive: true });
    fs.writeFileSync("e2e/fixtures/foto.png", Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5d50000000049454e44ae426082", "hex"));
  });

  test("abre solicitação com anexo, recebe protocolo e prazo calculado", async ({ page }) => {
    await page.goto("/solicitacoes");
    await page.getByRole("link", { name: /TI.*Sistemas e acessos/ }).click();
    await expect(page.getByRole("radio", { name: /^TI\b/ })).toBeChecked();
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page.getByText("O assunto precisa ter pelo menos 4 caracteres.")).toBeVisible();
    await page.getByLabel("Assunto").fill("Impressora sem conexão");
    await page.getByLabel("Descrição").fill("A impressora da portaria não conecta à rede desde hoje cedo.");
    await page.getByTestId("file-input").setInputFiles(path.join("e2e/fixtures", "foto.png"));
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await page.getByRole("dialog", { name: "Confirmar envio" }).getByRole("button", { name: "Confirmar e enviar" }).click();
    await expect(page.getByText("Solicitação enviada!")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Impressora sem conexão" })).toBeVisible();
    await expect(page.getByText("Resolução prevista até")).toBeVisible();
    await expect(page.getByRole("link", { name: /foto\.png/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Histórico" })).toBeVisible();
    await expect(page.getByText("Solicitação aberta")).toBeVisible();
  });

  test("responder quando a equipe aguarda retoma o atendimento", async ({ page }) => {
    await page.goto("/solicitacoes?aba=aguardando");
    await page.getByRole("link", { name: /Manutenção do ar-condicionado/ }).first().click();
    await expect(page.getByText("A equipe aguarda sua resposta")).toBeVisible();
    await page.getByRole("textbox", { name: "Mensagem" }).fill("2º andar, sala 204.");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Mensagem enviada.")).toBeVisible();
    await expect(page.getByText("2º andar, sala 204.")).toBeVisible();
    await expect(page.getByText("Em andamento").first()).toBeVisible();
    await expect(page.getByText("Prazo retomado")).toBeVisible();
  });

  test("confirmar solução de solicitação respondida", async ({ page }) => {
    await page.goto("/solicitacoes/1042");
    await page.getByRole("button", { name: "Problema resolvido" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Sim, foi resolvido" }).click();
    await expect(page.getByText("Solicitação concluída")).toBeVisible();
  });

  test("salvar rascunho, retomar e cancelar solicitação", async ({ page }) => {
    await page.goto("/solicitacoes/nova");
    await page.locator("label", { hasText: "Facilities" }).click();
    await page.getByLabel("Assunto").fill("Lâmpada queimada");
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(page.getByText(/Rascunho salvo/)).toBeVisible();
    await page.goto("/solicitacoes?aba=rascunhos");
    await page.getByRole("link", { name: /Lâmpada queimada/ }).click();
    await expect(page.getByLabel("Assunto")).toHaveValue("Lâmpada queimada");
    await page.getByLabel("Descrição").fill("A lâmpada do corredor do 3º andar queimou.");
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar e enviar" }).click();
    await expect(page.getByText("Solicitação enviada!")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar solicitação" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Sim, cancelar" }).click();
    await expect(page.getByText("Solicitação cancelada").first()).toBeVisible();
    await page.goto("/solicitacoes?aba=rascunhos");
    await expect(page.getByRole("link", { name: /Lâmpada queimada/ })).toHaveCount(0);
  });

  test("filtros por categoria e período ficam na URL e sobrevivem ao recarregar", async ({ page }) => {
    await page.goto("/solicitacoes");
    await page.getByRole("button", { name: "Filtros" }).click();
    const dialog = page.getByRole("dialog", { name: "Filtrar solicitações" });
    await dialog.getByLabel("Categoria").selectOption("facilities");
    await dialog.getByLabel("Período de abertura").selectOption("30");
    await dialog.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/categoria=facilities/);
    await expect(page).toHaveURL(/periodo=30/);
    await page.reload();
    const table = page.getByRole("table", { name: "Solicitações" });
    await expect(table.getByRole("link", { name: "Manutenção do ar-condicionado" })).toBeVisible();
    await expect(table.getByRole("link", { name: "Atualização cadastral" })).toHaveCount(0);
  });

  test("ao digitar o assunto, sugere artigos da central de ajuda", async ({ page }) => {
    await page.goto("/solicitacoes/nova");
    await page.getByLabel("Assunto").fill("Esqueci minha senha do sistema");
    const tips = page.getByRole("region", { name: "Artigos que podem ajudar" });
    await expect(tips.getByRole("link", { name: /Esqueci minha senha\. E agora\?/ })).toBeVisible();
  });

  test("chat com o suporte: inicia conversa, envia mensagens e vira solicitação rastreável", async ({ page }) => {
    await page.goto("/ajuda");
    await page.getByRole("link", { name: "Chat com o suporte" }).click();
    await expect(page).toHaveURL(/\/ajuda\/chat$/);
    await expect(page.getByText(/Sobre o que você quer falar\?/)).toBeVisible();
    // Sem assunto, não envia.
    await page.getByLabel("Primeira mensagem").fill("Meu crachá não abre a catraca da portaria");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Escolha sobre o que você quer falar.")).toBeVisible();
    await page.locator("label").filter({ hasText: /^Serviços/ }).click();
    await expect(page.getByRole("radio", { name: /^Serviços/ })).toBeChecked();
    await page.getByLabel("Primeira mensagem").press("Enter");
    const chat = page.getByRole("list", { name: "Conversa" });
    await expect(chat.getByText("Meu crachá não abre a catraca da portaria")).toBeVisible();
    await expect(page.getByText(/Uma pessoa do time de Serviços vai responder/)).toBeVisible();
    // Segunda mensagem pelo campo da conversa (Enter envia).
    await page.getByLabel("Mensagem", { exact: true }).fill("Desde ontem à tarde.");
    await page.getByLabel("Mensagem", { exact: true }).press("Enter");
    await expect(chat.getByText("Desde ontem à tarde.")).toBeVisible();
    // A conversa aparece em Minhas solicitações, com protocolo.
    const protocol = await page.getByRole("link", { name: /^#\d{4}$/ }).first().innerText();
    await page.goto("/solicitacoes");
    await expect(page.getByRole("table", { name: "Solicitações" }).getByText(protocol)).toBeVisible();
    // Encerrar sem resposta cancela o pedido e libera um novo chat.
    await page.goto("/ajuda/chat");
    await page.getByRole("button", { name: "Encerrar conversa" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Encerrar conversa" }).click();
    await expect(page.getByText(/Sobre o que você quer falar\?/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Conversas anteriores/ })).toBeVisible();
  });

  test("solicitação de outra pessoa retorna 404", async ({ page }) => {
    await page.goto("/solicitacoes/1050");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    expect((await page.request.get("/api/v1/tickets/1050")).status()).toBe(404);
  });

  test("Fale com o RH está oculto: sem link na navegação e rota 404", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Fale com o RH" })).toHaveCount(0);
    await page.goto("/fale-com-rh");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });
});
