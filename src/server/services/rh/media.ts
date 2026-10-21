import { and, eq, or, sql } from "drizzle-orm";
import { can, type Ctx } from "../../auth/actor";
import { getDb } from "../../db/client";
import { announcements, courses, fileAssets } from "../../db/schema";
import { AppError, forbidden, notFound } from "../../errors";
import { storeUpload } from "../../files/storage";

/** URL interna de uma imagem de capa enviada pela gestão. */
export const mediaUrl = (id: string) => `/api/v1/media/${id}`;
export const MEDIA_URL_RE = /^\/api\/v1\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Envio de imagem de capa (JPG/PNG). Fica no armazenamento privado; só é servida a usuários autenticados. */
export async function uploadCoverImage(ctx: Ctx, file: { name: string; bytes: Uint8Array }) {
  if (!can(ctx.actor, "announcement:manage") && !can(ctx.actor, "course:manage")) throw forbidden();
  const stored = await storeUpload(file, ctx.actor.userId);
  if (!stored.mimeType.startsWith("image/")) {
    // Arquivo válido, mas não é imagem: descarta o registro para não deixar órfão utilizável.
    await getDb().update(fileAssets).set({ deletedAt: new Date() }).where(eq(fileAssets.id, stored.id));
    throw new AppError("UNSUPPORTED_FILE", "Envie uma imagem JPG ou PNG para a capa.");
  }
  return { id: stored.id, url: mediaUrl(stored.id) };
}

/**
 * Capa servida a qualquer usuário autenticado somente se estiver em uso como capa (comunicado ou curso)
 * ou se foi enviada pelo próprio usuário (pré-visualização antes de salvar).
 */
export async function openCoverImage(ctx: Ctx, id: string) {
  const url = mediaUrl(id);
  const [asset] = await getDb()
    .select()
    .from(fileAssets)
    .where(
      and(
        eq(fileAssets.id, id),
        sql`${fileAssets.deletedAt} IS NULL`,
        sql`${fileAssets.mimeType} LIKE 'image/%'`,
        or(
          eq(fileAssets.uploadedByUserId, ctx.actor.userId),
          sql`EXISTS (SELECT 1 FROM ${announcements} WHERE cover_image = ${url})`,
          sql`EXISTS (SELECT 1 FROM ${courses} WHERE cover_image = ${url})`,
        ),
      ),
    )
    .limit(1);
  if (!asset) throw notFound("Imagem");
  return asset;
}
