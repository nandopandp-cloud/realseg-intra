import { sql } from "./support/db";
import { asUser, expect, test } from "./support/fixtures";

/** G — Cursos: matrícula, progresso, retomada, conclusão idempotente e certificado. Usuário: João (sem histórico). */
test.describe("cursos", () => {
  test.use(asUser("joao"));

  test("catálogo filtra por categoria e busca", async ({ page }) => {
    await page.goto("/cursos");
    await page.getByRole("link", { name: "Liderança", exact: true }).click();
    await expect(page).toHaveURL(/categoria=lideranca/);
    await expect(page.getByRole("link", { name: /Liderança na prática/ })).toBeVisible();
    await page.goto("/cursos?q=incendio");
    await expect(page.getByRole("link", { name: /Prevenção e combate a incêndios/ })).toBeVisible();
  });

  test("matricula, conclui aulas, retoma de onde parou e recebe certificado", async ({ page }) => {
    await page.goto("/cursos/cultura-de-seguranca");
    await page.getByRole("button", { name: "Iniciar curso" }).click();
    await expect(page.getByText("Aula 1 de 5")).toBeVisible();
    await page.getByRole("button", { name: "Concluir aula" }).click();
    await expect(page.getByText(/Aula concluída/)).toBeVisible();
    // Retomada: voltar ao curso e continuar leva à aula 2
    await page.goto("/cursos/cultura-de-seguranca");
    await expect(page.getByText("1 de 5 aulas concluídas")).toBeVisible();
    await page.getByRole("link", { name: "Continuar de onde parei" }).click();
    await expect(page.getByText("Aula 2 de 5")).toBeVisible();
    for (let i = 2; i <= 5; i++) {
      await page.getByRole("button", { name: "Concluir aula" }).click();
      await expect(page.getByText(/Aula concluída/)).toBeVisible();
      if (i < 5) await page.getByRole("button", { name: "Próxima aula" }).click();
    }
    await expect(page.getByText("Parabéns! Curso concluído.")).toBeVisible();
    await page.getByRole("link", { name: "Ver certificado" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "João Pereira" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Certificado" }).getByText("Cultura de segurança")).toBeVisible();
    const certs = await sql(`select c.id from certificates c join enrollments e on e.id = c.enrollment_id join users u on u.id = e.user_id where u.email = 'joao.pereira@demo.realseg.invalid'`);
    expect(certs).toHaveLength(1);
    // Repetir conclusão (chamada direta à API, como o navegador faria) não duplica certificado
    const [lesson] = await sql<{ id: string }>(`select l.id from lessons l join course_modules m on m.id = l.module_id join courses c on c.id = m.course_id where c.slug = 'cultura-de-seguranca' limit 1`);
    const origin = new URL(page.url()).origin;
    const repeat = await page.request.post(`/api/v1/lessons/${lesson.id}/complete`, { headers: { origin } });
    expect(repeat.status()).toBe(200);
    expect(await repeat.json()).toMatchObject({ percent: 100, completedNow: false });
    // Sem Origin (possível CSRF) a API recusa
    expect((await page.request.post(`/api/v1/lessons/${lesson.id}/complete`)).status()).toBe(403);
    expect(await sql(`select c.id from certificates c join enrollments e on e.id = c.enrollment_id join users u on u.id = e.user_id where u.email = 'joao.pereira@demo.realseg.invalid'`)).toHaveLength(1);
  });

  test("curso restrito a outro setor não é acessível para Carlos", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: "e2e/.auth/carlos.json" });
    const page = await ctx.newPage();
    await page.goto("/cursos/gestao-administrativa");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    await ctx.close();
  });
});
