import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { sql } from "./support/db";
import { PASSWORD, USERS } from "./support/users";

/**
 * A — Autenticação. Pré-condição: base E2E recém-semeada. Usuário: colaboradores demo.
 */
test.describe("autenticação", () => {
  test("rota protegida sem sessão redireciona ao login preservando o destino", async ({ page }) => {
    await page.goto("/documentos?categoria=holerite");
    await expect(page).toHaveURL(/\/login\?next=%2Fdocumentos%3Fcategoria%3Dholerite/);
    await page.getByLabel("E-mail ou matrícula").fill(USERS.carlos.email);
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/documentos\?categoria=holerite/);
    await expect(page.getByRole("heading", { level: 1, name: "Meus documentos" })).toBeVisible();
  });

  test("credenciais inválidas mostram erro genérico e campos obrigatórios são validados", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Informe seu e-mail ou matrícula.")).toBeVisible();
    await expect(page.getByText("Informe sua senha.")).toBeVisible();
    await page.getByLabel("E-mail ou matrícula").fill(USERS.carlos.login);
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("E-mail/matrícula ou senha incorretos.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("bloqueio após tentativas repetidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matrícula").fill("900001");
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Senha", { exact: true }).fill(`errada-${i}`);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
    }
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("Muitas tentativas");
  });

  test("usuário inativo não entra", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matrícula").fill("900003");
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("incorretos");
  });

  test("logout encerra a sessão no servidor", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matrícula").fill(USERS.joao.login);
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
    const cookie = (await page.context().cookies()).find((c) => c.name === "rs_session")!;
    await page.getByRole("button", { name: /Abrir menu da conta/ }).click();
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login\?motivo=saiu/);
    // Reutilizar o cookie antigo não funciona mais
    await page.context().addCookies([cookie]);
    const res = await page.request.get("/api/v1/me");
    expect(res.status()).toBe(401);
  });

  test("sessão expirada por inatividade leva ao login com aviso", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail ou matrícula").fill(USERS.ana.login);
    await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
    // Expira apenas a sessão deste navegador (a sessão salva para outros testes continua válida).
    const token = (await page.context().cookies()).find((c) => c.name === "rs_session")!.value;
    await sql(`update sessions set last_seen_at = now() - interval '2 hours' where id = $1`, [createHash("sha256").update(token).digest("hex")]);
    await page.goto("/comunicados");
    await expect(page).toHaveURL(/motivo=sessao-expirada/);
    await expect(page.getByText("Sua sessão expirou")).toBeVisible();
  });

  test("recuperação de senha com link de uso único", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await page.getByLabel("E-mail corporativo").fill("reset@demo.realseg.invalid");
    await page.getByRole("button", { name: "Enviar link" }).click();
    await expect(page.getByText("Verifique seu e-mail")).toBeVisible();
    const [mail] = await sql<{ text: string }>(`select text from mail_outbox where "to" = $1 order by created_at desc limit 1`, ["reset@demo.realseg.invalid"]);
    const link = /(http\S+redefinir-senha\?token=\S+)/.exec(mail.text)![1];
    await page.goto(link);
    await page.getByLabel("Nova senha", { exact: true }).fill("curta");
    await page.getByLabel("Confirme a nova senha").fill("curta");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByText("A senha precisa ter pelo menos 10 caracteres.")).toBeVisible();
    await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha2026");
    await page.getByLabel("Confirme a nova senha").fill("NovaSenha2026");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page).toHaveURL(/motivo=senha-redefinida/);
    await page.getByLabel("E-mail ou matrícula").fill("900002");
    await page.getByLabel("Senha", { exact: true }).fill("NovaSenha2026");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
    // Link reutilizado é recusado
    await page.goto(link);
    await page.getByLabel("Nova senha", { exact: true }).fill("OutraSenha2026");
    await page.getByLabel("Confirme a nova senha").fill("OutraSenha2026");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toContainText("inválido ou expirou");
  });

  test("CSRF: requisição de outra origem é recusada", async ({ request }) => {
    const res = await request.post("/api/v1/auth/login", { data: { identifier: USERS.carlos.login, password: PASSWORD }, headers: { origin: "https://evil.example" } });
    expect(res.status()).toBe(403);
  });
});
