/** Gera um PDF simples (1 página, Helvetica) para documentos de DEMONSTRAÇÃO/E2E. */
export function makeDemoPdf(title: string, lines: string[]): Uint8Array {
  const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const body = [
    "BT",
    "/F1 9 Tf",
    "0.75 0.1 0.1 rg",
    "50 800 Td",
    "(DOCUMENTO DE DEMONSTRACAO - SEM VALOR LEGAL) Tj",
    "0.04 0.1 0.18 rg",
    "/F1 18 Tf",
    "0 -40 Td",
    `(${esc(title)}) Tj`,
    "/F1 11 Tf",
    ...lines.flatMap((l) => ["0 -22 Td", `(${esc(l)}) Tj`]),
    "ET",
  ].join("\n");
  const content = Buffer.from(body, "latin1");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  const offsets: number[] = [];
  let length = chunks[0].length;
  const push = (b: Buffer) => {
    chunks.push(b);
    length += b.length;
  };
  objects.forEach((o, i) => {
    offsets.push(length);
    push(Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, "latin1"));
  });
  offsets.push(length);
  push(Buffer.from(`5 0 obj\n<< /Length ${content.length} >>\nstream\n`, "latin1"));
  push(content);
  push(Buffer.from("\nendstream\nendobj\n", "latin1"));
  const xrefStart = length;
  const xref = ["xref", "0 6", "0000000000 65535 f ", ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n `)].join("\n");
  push(Buffer.from(`${xref}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`, "latin1"));
  return new Uint8Array(Buffer.concat(chunks));
}
