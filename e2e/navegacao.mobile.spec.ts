import path from "node:path";
import fs from "node:fs";
import { asUser, expect, expectNoHorizontalOverflow, test } from "./support/fixtures";

/** Jornadas no celular: navegação inferior, menu "Mais" e envio de documento com alvo de toque adequado. */
test.describe("celular", () => {
  test.use(asUser("ana"));

  test("barra inferior navega e destaca a seção atual", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegação principal" });
    await nav.getByRole("link", { name: "Documentos" }).click();
    await expect(page).toHaveURL(/\/documentos$/);
    await expect(nav.getByRole("link", { name: "Documentos" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("button", { name: "Mais" }).click();
    await page.getByRole("dialog", { name: "Mais opções" }).getByRole("link", { name: /Cursos/ }).click();
    await expect(page).toHaveURL(/\/cursos$/);
    await expectNoHorizontalOverflow(page);
  });

  test("alvos de toque da navegação têm pelo menos 44px", async ({ page }) => {
    await page.goto("/");
    const items = page.getByRole("navigation", { name: "Navegação principal" }).locator("a, button");
    for (const box of await items.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
  });

  test("envio de atestado pelo celular", async ({ page }) => {
    fs.mkdirSync("e2e/fixtures", { recursive: true });
    fs.writeFileSync("e2e/fixtures/atestado-mobile.pdf", "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
    await page.goto("/documentos/enviar");
    await expect(page.getByRole("button", { name: "Tirar foto" })).toBeVisible();
    await page.getByRole("radio", { name: /^Atestado médico/ }).check();
    await page.getByLabel("Nome do documento").fill("Atestado pelo celular");
    await page.getByTestId("file-input").setInputFiles(path.join("e2e/fixtures", "atestado-mobile.pdf"));
    await page.getByRole("button", { name: "Revisar e enviar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirmar envio" }).click();
    await expect(page.getByText("Documento enviado!")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("menu da conta e saída no celular", async ({ page }) => {
    await page.goto("/perfil");
    await expect(page.getByRole("heading", { level: 1, name: "Meu perfil" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
