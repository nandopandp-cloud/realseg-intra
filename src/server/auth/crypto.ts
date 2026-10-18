import { createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

const PARAMS = { N: 2 ** 15, r: 8, p: 1, keylen: 64 };
const MAXMEM = 64 * 1024 * 1024;

/** Formato: scrypt$N$r$p$salt(base64)$hash(base64) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, PARAMS.keylen, { N: PARAMS.N, r: PARAMS.r, p: PARAMS.p, maxmem: MAXMEM });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const expected = Buffer.from(hashB64, "base64");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash fixo usado quando o usuário não existe, para equalizar o tempo de resposta. */
let dummyHash: Promise<string> | undefined;
export function getDummyHash() {
  dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
  return dummyHash;
}

/** Token opaco de 256 bits, seguro para URL/cookie. */
export const generateToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

/** Pseudonimiza IPs (auditoria/rate limit) com HMAC — o IP bruto nunca é persistido. */
export function hashIp(ip: string | null | undefined, secret: string): string | null {
  if (!ip) return null;
  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

/** Código curto não sequencial (ex.: certificado). */
export function shortCode(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
