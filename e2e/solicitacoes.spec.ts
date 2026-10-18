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

  test("solicitação de outra pessoa retorna 404", async ({ page }) => {
    await page.goto("/solicitacoes/1050");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    expect((await page.request.get("/api/v1/tickets/1050")).status()).toBe(404);
  });

  test("Fale com o RH cria solicitação na categoria RH", async ({ page }) => {
    await page.goto("/fale-com-rh");
    await page.getByLabel("Assunto").fill("Dúvida sobre vale-transporte");
    await page.getByLabel("Descrição").fill("Gostaria de saber como alterar a linha do vale-transporte.");
    await page.getByRole("button", { name: "Enviar mensagem ao RH" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar e enviar" }).click();
    await expect(page.getByText("Solicitação enviada!")).toBeVisible();
    await expect(page.getByText("RH", { exact: true }).first()).toBeVisible();
  });
});
