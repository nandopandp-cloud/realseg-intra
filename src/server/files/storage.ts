import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { getDb, type Executor } from "../db/client";
import { fileAssets } from "../db/schema";
import { env } from "../env";
import { AppError } from "../errors";
import { logger } from "../logger";
import { validateUpload } from "./validation";

/** Contrato de armazenamento privado (ADR-0007). Implementação S3 fica como pendência documentada. */
export interface StorageProvider {
  put(key: string, data: Uint8Array): Promise<void>;
  stream(key: string): Promise<ReadableStream<Uint8Array>>;
  remove(key: string): Promise<void>;
}

class LocalDiskStorage implements StorageProvider {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    if (!/^[0-9]{4}\/[0-9]{2}\/[0-9a-f-]{36}$/.test(key)) throw new Error("Chave de armazenamento inválida");
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Caminho fora do armazenamento");
    return full;
  }

  async put(key: string, data: Uint8Array) {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
    await fs.writeFile(full, data, { mode: 0o600, flag: "wx" });
  }

  async stream(key: string) {
    const full = this.resolve(key);
    await fs.access(full);
    return Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>;
  }

  async remove(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

let provider: StorageProvider | undefined;
export function storage(): StorageProvider {
  provider ??= new LocalDiskStorage(path.resolve(env().STORAGE_DIR));
  return provider;
}

/** Hook de antimalware. Sem scanner configurado o status fica "skipped" (explícito, não simulado). */
export interface MalwareScanner {
  scan(data: Uint8Array): Promise<"clean" | "infected">;
}
let scanner: MalwareScanner | null = null;
export function setMalwareScanner(s: MalwareScanner | null) {
  scanner = s;
}

export const maxUploadBytes = () => env().UPLOAD_MAX_MB * 1024 * 1024;

/**
 * Valida (extensão, tamanho, magic bytes), grava em disco privado com nome aleatório e registra metadados.
 * Retorna o id do file_asset. Em caso de falha no banco, o arquivo físico é removido.
 */
export async function storeUpload(
  file: { name: string; bytes: Uint8Array },
  uploadedByUserId: string | null,
  db: Executor = getDb(),
): Promise<{ id: string; originalName: string; mimeType: string; sizeBytes: number }> {
  const checked = validateUpload({ name: file.name, size: file.bytes.byteLength, bytes: file.bytes }, maxUploadBytes());
  let scanStatus: "clean" | "skipped" = "skipped";
  if (scanner) {
    const result = await scanner.scan(file.bytes);
    if (result === "infected") {
      logger.warn("upload.malware_detected", { uploadedByUserId });
      throw new AppError("UNSUPPORTED_FILE", "O arquivo foi bloqueado pela verificação de segurança.");
    }
    scanStatus = "clean";
  }
  const now = new Date();
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}`;
  await storage().put(key, file.bytes);
  try {
    const [row] = await db
      .insert(fileAssets)
      .values({
        storageKey: key,
        originalName: checked.originalName,
        mimeType: checked.mimeType,
        sizeBytes: file.bytes.byteLength,
        sha256: createHash("sha256").update(file.bytes).digest("hex"),
        uploadedByUserId,
        scanStatus,
      })
      .returning({ id: fileAssets.id });
    return { id: row.id, originalName: checked.originalName, mimeType: checked.mimeType, sizeBytes: file.bytes.byteLength };
  } catch (err) {
    await storage().remove(key).catch(() => {});
    throw err;
  }
}

export async function getFileAsset(id: string) {
  const [row] = await getDb().select().from(fileAssets).where(eq(fileAssets.id, id)).limit(1);
  return row ?? null;
}

/** Resposta de download segura. `inline` só para tipos visualizáveis; nunca cacheável. */
export async function fileResponse(asset: { storageKey: string; originalName: string; mimeType: string; sizeBytes: number }, disposition: "inline" | "attachment") {
  const body = await storage().stream(asset.storageKey);
  const encoded = encodeURIComponent(asset.originalName);
  const ascii = asset.originalName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return new Response(body, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.sizeBytes),
      "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Imagens abertas diretamente ficam isoladas; PDFs dependem do visualizador do navegador (bloqueado por sandbox).
      ...(asset.mimeType.startsWith("image/") ? { "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'" } : {}),
      "Cross-Origin-Resource-Policy": "same-origin",
    },
  });
}
