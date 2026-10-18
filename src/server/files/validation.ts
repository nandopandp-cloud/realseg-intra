import { AppError } from "../errors";

export type AllowedKind = "pdf" | "jpeg" | "png";

export const KIND_MIME: Record<AllowedKind, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
};

const EXTENSIONS: Record<string, AllowedKind> = {
  pdf: "pdf",
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
};

/** Detecta o tipo real pelo conteúdo (magic bytes), ignorando o Content-Type informado pelo cliente. */
export function sniffKind(bytes: Uint8Array): AllowedKind | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return "pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return "png";
  return null;
}

/** Remove caminho, caracteres de controle e limita o tamanho. Nunca é usado como nome físico. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "arquivo";
  const cleaned = base
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned === "." || cleaned === "..") return "arquivo";
  if (cleaned.length <= 120) return cleaned;
  const dot = cleaned.lastIndexOf(".");
  const ext = dot > 0 ? cleaned.slice(dot) : "";
  return cleaned.slice(0, 120 - ext.length) + ext;
}

/** PDFs com ações automáticas/scripts são recusados (vetor comum de malware). */
function pdfHasActiveContent(bytes: Uint8Array): boolean {
  const text = Buffer.from(bytes).toString("latin1");
  return /\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction\s*<<[^>]*\/JS)\b/.test(text);
}

export function validateUpload(input: { name: string; size: number; bytes: Uint8Array }, maxBytes: number) {
  if (input.size === 0) throw new AppError("VALIDATION_ERROR", "O arquivo está vazio.");
  if (input.size > maxBytes) {
    throw new AppError("PAYLOAD_TOO_LARGE", `O arquivo excede o limite de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  const ext = input.name.split(".").pop()?.toLowerCase() ?? "";
  const expected = EXTENSIONS[ext];
  if (!expected) throw new AppError("UNSUPPORTED_FILE", "Formato não aceito. Envie PDF, JPG ou PNG.");
  const actual = sniffKind(input.bytes);
  if (actual !== expected) {
    throw new AppError("UNSUPPORTED_FILE", "O conteúdo do arquivo não corresponde a um PDF, JPG ou PNG válido.");
  }
  if (actual === "pdf" && pdfHasActiveContent(input.bytes)) {
    throw new AppError("UNSUPPORTED_FILE", "PDFs com conteúdo ativo (scripts ou anexos) não são aceitos.");
  }
  return { kind: actual, mimeType: KIND_MIME[actual], originalName: sanitizeFileName(input.name) };
}
