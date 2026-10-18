import "server-only";
import { notFound } from "next/navigation";
import { isAppError } from "../errors";

/** Em páginas: recurso inexistente OU sem acesso vira 404 (não revela existência). */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (isAppError(e) && (e.code === "NOT_FOUND" || e.code === "FORBIDDEN")) notFound();
    throw e;
  }
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
