import { asUser, expect, expectNoHorizontalOverflow, test } from "./support/fixtures";

test.describe("gestão no celular", () => {
  test.use(asUser("mariana"));
  for (const path of ["/rh", "/rh/solicitacoes", "/rh/comunicados", "/rh/documentos"]) {
    test(`${path}: menu rolável e sem rolagem horizontal da página`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: "Seções da gestão" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
