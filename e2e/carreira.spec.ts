import { sql } from "./support/db";
import { asUser, expect, test } from "./support/fixtures";

/** H/I — Carreira e feedbacks. */
test.describe("carreira", () => {
  test.use(asUser("carlos"));

  test("visão geral e abas", async ({ page }) => {
    await page.goto("/carreira");
    await expect(page.getByText("Trilha: Operacional")).toBeVisible();
    await page.getByRole("link", { name: "Cargos e salários" }).click();
    await expect(page.getByRole("heading", { name: /Plano de cargos e salários — Operacional/ })).toBeVisible();
    await expect(page.getByText("Seu cargo atual")).toBeVisible();
  });

  test("faixas não publicadas não aparecem (nem na API)", async ({ page }) => {
    await page.goto("/carreira/cargos");
    const gerente = page.locator("li", { hasText: "Gerente de Operações" });
    await expect(gerente.getByText("Faixa não divulgada")).toBeVisible();
    const plan = await (await page.request.get("/api/v1/career/plan")).text();
    expect(plan).not.toContain("1200000");
  });

  test("candidatura e retirada em oportunidade interna", async ({ page }) => {
    await page.goto("/carreira/oportunidades");
    await page.getByRole("link", { name: /Motorista de Transporte/ }).click();
    await page.getByRole("button", { name: "Quero me candidatar" }).click();
    await page.getByRole("dialog").getByLabel(/Mensagem para o RH/).fill("Tenho CNH D.");
    await page.getByRole("dialog").getByRole("button", { name: "Enviar candidatura" }).click();
    await expect(page.getByText("Você se candidatou a esta vaga")).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Retirar candidatura" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Retirar" }).click();
    await expect(page.getByRole("button", { name: "Quero me candidatar" })).toBeVisible();
  });

  test("oportunidade inelegível não é acessível", async ({ page }) => {
    const [o] = await sql<{ id: string }>(`select id from internal_opportunities where title = 'Assistente de RH'`);
    await page.goto(`/carreira/oportunidades/${o.id}`);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });

  test("feedback: leitura e confirmação (sem concordância)", async ({ page }) => {
    await page.goto("/carreira/avaliacoes");
    await page.getByRole("link", { name: /Destaque do mês/ }).click();
    await expect(page.getByText("não significa que você concorda")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar leitura" }).click();
    await expect(page.getByText("Leitura confirmada").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Você confirmou em/)).toBeVisible();
  });

  test("feedback de outra pessoa é negado", async ({ page }) => {
    const [f] = await sql<{ id: string }>(`select f.id from feedbacks f join employees e on e.id = f.employee_id where e.registration_number = '100198'`);
    await page.goto(`/carreira/avaliacoes/${f.id}`);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    expect((await page.request.get(`/api/v1/feedbacks/${f.id}`)).status()).toBe(404);
  });
});
