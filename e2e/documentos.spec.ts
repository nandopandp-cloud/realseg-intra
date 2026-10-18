import path from "node:path";
import fs from "node:fs";
import { sql } from "./support/db";
import { asUser, expect, test } from "./support/fixtures";

/** D/E — Documentos e dados sensíveis. */
const FIXTURES = "e2e/fixtures";
test.beforeAll(() => {
  fs.mkdirSync(FIXTURES, { recursive: true });
  fs.writeFileSync(path.join(FIXTURES, "atestado.pdf"), "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
  fs.writeFileSync(path.join(FIXTURES, "programa.exe"), "MZ\x90\x00binario");
  fs.writeFileSync(path.join(FIXTURES, "disfarcado.pdf"), "<html><script>alert(1)</script></html>");
});

test.describe("documentos", () => {
  test.use(asUser("carlos"));

  test("lista, filtra por categoria e mantém filtro após recarregar", async ({ page }) => {
    await page.goto("/documentos");
    await expect(page.getByText(/Mostrando 8 de 15 documentos/)).toBeVisible();
    await page.getByRole("button", { name: /Filtros/ }).click();
    await page.getByRole("dialog").getByLabel("Categoria").selectOption("comunicado-individual");
    await page.getByRole("button", { name: "Aplicar filtros" }).click();
    await expect(page).toHaveURL(/categoria=comunicado-individual/);
    await page.reload();
    await expect(page.getByText(/Mostrando 2 de 2 documentos/)).toBeVisible();
  });

  test("download autorizado do próprio holerite", async ({ page }) => {
    await page.goto("/documentos?categoria=holerite");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Baixar Holerite - Setembro/2026" }).first().click();
    expect((await download).suggestedFilename()).toBe("Holerite - Setembro-2026.pdf");
  });

  test("holerite de outra pessoa é negado no servidor (URL e API)", async ({ page }) => {
    const [doc] = await sql<{ id: string }>(`select d.id from documents d join employees e on e.id = d.owner_employee_id where e.registration_number = '100198' limit 1`);
    await page.goto(`/documentos/${doc.id}`);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    for (const disp of ["attachment", "inline"]) {
      expect((await page.request.get(`/api/v1/documents/${doc.id}/file?disposition=${disp}`)).status()).toBe(404);
    }
  });

  test("confirma ciência de documento pendente", async ({ page }) => {
    await page.goto("/documentos?status=pendente");
    await page.getByRole("link", { name: "Carta de Advertência" }).first().click();
    await page.getByRole("button", { name: "Confirmar ciência" }).click();
    await expect(page.getByText("Ciência confirmada").first()).toBeVisible();
    await page.goto("/documentos/historico");
    await expect(page.getByText("Você confirmou ciência").first()).toBeVisible();
  });

  test("envio de documento: validação, confirmação, protocolo e acompanhamento", async ({ page }) => {
    await page.goto("/documentos/enviar");
    await page.getByRole("button", { name: "Revisar e enviar" }).click();
    await expect(page.getByText("Selecione um arquivo.")).toBeVisible();
    await page.getByRole("radio", { name: /^Atestado médico/ }).check();
    await page.getByLabel("Nome do documento").fill("Atestado consulta E2E");
    await page.getByTestId("file-input").setInputFiles(path.join(FIXTURES, "programa.exe"));
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("formato não aceito");
    await page.getByTestId("file-input").setInputFiles(path.join(FIXTURES, "atestado.pdf"));
    await page.getByRole("button", { name: "Revisar e enviar" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirmar envio ao RH" });
    await expect(dialog.getByText("atestado.pdf")).toBeVisible();
    await dialog.getByRole("button", { name: "Confirmar envio" }).click();
    await expect(page.getByText("Documento enviado!")).toBeVisible();
    await page.getByRole("link", { name: "Acompanhar envio" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Atestado consulta E2E" })).toBeVisible();
    await expect(page.getByText("Enviado").first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Cancelar envio" })).toBeVisible();
  });

  test("conteúdo disfarçado é recusado pelo servidor mesmo com extensão válida", async ({ page }) => {
    await page.goto("/documentos/enviar");
    await page.getByRole("radio", { name: /^Declaração/ }).check();
    await page.getByLabel("Nome do documento").fill("Arquivo disfarçado");
    await page.getByTestId("file-input").setInputFiles(path.join(FIXTURES, "disfarcado.pdf"));
    await page.getByRole("button", { name: "Revisar e enviar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar envio" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ }).first()).toContainText("não corresponde a um PDF, JPG ou PNG válido");
  });

  test("envio recusado mostra o motivo", async ({ page }) => {
    await page.goto("/documentos/enviar");
    await page.getByRole("link", { name: /Comprovante de residência/ }).click();
    await expect(page.getByText("Documento recusado pelo RH")).toBeVisible();
    await expect(page.getByText(/Motivo: Imagem ilegível/)).toBeVisible();
  });
});
