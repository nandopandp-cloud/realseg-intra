import { AppError } from "../errors";
import { maxUploadBytes } from "../files/storage";

/**
 * Lê multipart/form-data com limites: tamanho total (Content-Length), quantidade de arquivos
 * e tamanho por arquivo (validado de novo em storeUpload).
 */
export async function readMultipart(req: Request, opts: { fileField?: string; maxFiles: number }) {
  const type = req.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data")) throw new AppError("VALIDATION_ERROR", "Envie os dados como formulário (multipart/form-data).");
  const max = maxUploadBytes();
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > max * opts.maxFiles + 1024 * 1024) throw new AppError("PAYLOAD_TOO_LARGE", `Os arquivos excedem o limite de ${Math.round(max / 1024 / 1024)} MB cada.`);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Formulário inválido.");
  }
  const fields: Record<string, string> = {};
  const files: Array<{ name: string; bytes: Uint8Array }> = [];
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") {
      fields[key] = value;
    } else if (key === (opts.fileField ?? "files") && value.size > 0) {
      if (files.length >= opts.maxFiles) throw new AppError("VALIDATION_ERROR", `Envie no máximo ${opts.maxFiles} arquivo(s).`);
      if (value.size > max) throw new AppError("PAYLOAD_TOO_LARGE", `O arquivo "${value.name}" excede ${Math.round(max / 1024 / 1024)} MB.`);
      files.push({ name: value.name, bytes: new Uint8Array(await value.arrayBuffer()) });
    }
  }
  return { fields, files };
}
