/**
 * Reparo de arquivos de DEMONSTRAÇÃO: antes do driver R2, a homologação gravava em /tmp (efêmero) e os
 * arquivos se perderam. Para cada file_asset sem objeto no armazenamento, gera um substituto de demonstração
 * e atualiza tamanho/hash. Só roda com dados de demonstração e fora de produção (chamado pelo seed).
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Database } from "@/server/db/client";
import { fileAssets } from "@/server/db/schema";
import { storage } from "@/server/files/storage";
import { makeDemoPdf } from "./pdf";

const UNIFORME_PNG = path.join(import.meta.dirname, "assets/uniforme-ilustrativo.png");

export async function repairDemoFiles(db: Database) {
  const rows = await db.select({ id: fileAssets.id, key: fileAssets.storageKey, name: fileAssets.originalName, mime: fileAssets.mimeType }).from(fileAssets);
  let repaired = 0;
  for (const r of rows) {
    const exists = await storage()
      .stream(r.key)
      .then((s) => (s.cancel(), true))
      .catch(() => false);
    if (exists) continue;
    let bytes: Uint8Array | null = null;
    if (r.mime === "application/pdf") bytes = makeDemoPdf(r.name.replace(/\.pdf$/i, ""), ["Documento de demonstração da Intranet REALSEG."]);
    else if (r.mime === "image/png") bytes = fs.readFileSync(UNIFORME_PNG);
    if (!bytes) continue;
    await storage().put(r.key, bytes);
    await db
      .update(fileAssets)
      .set({ sizeBytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") })
      .where(eq(fileAssets.id, r.id));
    repaired++;
  }
  console.log(`Arquivos de demonstração: ${repaired} restaurado(s) de ${rows.length}.`);
}
