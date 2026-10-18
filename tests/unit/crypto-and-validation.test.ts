import { describe, expect, it } from "vitest";
import { generateToken, hashIp, hashPassword, sha256Hex, shortCode, verifyPassword } from "@/server/auth/crypto";
import { changePasswordSchema, loginSchema, newPasswordSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "@/server/auth/permissions";

describe("hash de senha (scrypt)", () => {
  it("verifica senha correta e rejeita incorreta", async () => {
    const h = await hashPassword("Senha-Forte-123");
    expect(h.startsWith("scrypt$32768$8$1$")).toBe(true);
    expect(await verifyPassword("Senha-Forte-123", h)).toBe(true);
    expect(await verifyPassword("senha-forte-123", h)).toBe(false);
  });
  it("gera salts distintos", async () => {
    expect(await hashPassword("abc12345678")).not.toBe(await hashPassword("abc12345678"));
  });
  it("rejeita formato desconhecido", async () => {
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });
});

describe("tokens e pseudonimização", () => {
  it("tokens têm 256 bits e são únicos", () => {
    const a = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(a);
  });
  it("sha256 determinístico", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("hash de IP depende do segredo e ignora ausência", () => {
    expect(hashIp("10.0.0.1", "segredo-a-123456")).not.toBe(hashIp("10.0.0.1", "segredo-b-123456"));
    expect(hashIp(null, "segredo-a-123456")).toBeNull();
  });
  it("código curto sem caracteres ambíguos", () => {
    expect(shortCode(12)).toMatch(/^[A-HJ-NP-Z2-9]{12}$/);
  });
});

describe("validação de autenticação", () => {
  it("login exige identificador e senha", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: " carlos@realseg.com.br ", password: "x" }).data?.identifier).toBe("carlos@realseg.com.br");
  });
  it("política de senha", () => {
    expect(newPasswordSchema.safeParse("curta1").success).toBe(false);
    expect(newPasswordSchema.safeParse("somenteletras").success).toBe(false);
    expect(newPasswordSchema.safeParse("1234567890").success).toBe(false);
    expect(newPasswordSchema.safeParse("Realseg2026!").success).toBe(true);
  });
  it("confirmação deve coincidir", () => {
    const r = resetPasswordSchema.safeParse({ token: "x".repeat(43), password: "Realseg2026!", confirmPassword: "Realseg2026?" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["confirmPassword"]);
  });
  it("nova senha diferente da atual", () => {
    const r = changePasswordSchema.safeParse({ currentPassword: "Realseg2026!", password: "Realseg2026!", confirmPassword: "Realseg2026!" });
    expect(r.success).toBe(false);
  });
});

describe("catálogo de permissões", () => {
  it("todo papel referencia apenas permissões existentes", () => {
    for (const perms of Object.values(DEFAULT_ROLE_PERMISSIONS)) {
      for (const p of perms) expect(PERMISSIONS).toHaveProperty(p);
    }
  });
  it("colaborador não possui permissões de gestão", () => {
    const colab = new Set(DEFAULT_ROLE_PERMISSIONS.COLABORADOR);
    for (const p of ["document:read:any", "ticket:manage", "announcement:report", "salary_band:read:any", "audit:read"]) {
      expect(colab.has(p as never)).toBe(false);
    }
  });
});
