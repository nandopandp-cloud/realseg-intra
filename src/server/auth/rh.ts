import "server-only";
import { notFound } from "next/navigation";
import { can, canManage, type Ctx } from "./actor";
import { requireCtx } from "./current";
import type { Permission } from "./permissions";

/**
 * Páginas do ambiente de gestão: sessão válida + acesso à gestão + permissão da tela.
 * Sem acesso a resposta é 404 (não revela que a tela existe), como no resto da intranet.
 */
export async function requireRhCtx(permission?: Permission): Promise<Ctx> {
  const ctx = await requireCtx();
  if (!canManage(ctx.actor)) notFound();
  if (permission && !can(ctx.actor, permission)) notFound();
  return ctx;
}
