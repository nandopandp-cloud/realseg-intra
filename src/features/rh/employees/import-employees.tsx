"use client";

import { useState } from "react";
import { CircleCheck, Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/primitives";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";

type Report = { total: number; valid: number; created: number; rows: Array<{ line: number; ok: boolean; message: string }> };

const TEMPLATE = [
  "matricula;nome;email;area;unidade;cargo;admissao;gestor_matricula",
  "100500;Fulana de Tal;fulana.tal@empresa.com.br;OPS;Sede Administrativa;Auxiliar Operacional;01/11/2026;100045",
].join("\r\n");

/** Importação de colaboradores por planilha CSV: conferência linha a linha antes de gravar; acesso por convite. */
export function ImportEmployees() {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReport(null);
    setDone(false);
    if (!/\.csv$/i.test(file.name)) return setError("Envie um arquivo .csv (no Excel: Salvar como › CSV UTF-8).");
    if (file.size > 600_000) return setError("Planilha muito grande. Importe até 500 colaboradores por vez.");
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    await run(text, true);
  }

  async function run(text: string, dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<Report>("/rh/employees/import", { json: { csv: text, dryRun } });
      setReport(r);
      if (!dryRun) setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível ler a planilha.");
    } finally {
      setBusy(false);
    }
  }

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + TEMPLATE)}`;
  return (
    <div className="flex flex-col gap-5">
      <Alert kind="info" title="Formato da planilha">
        Colunas: <code>matricula; nome; email; area; unidade; cargo; admissao; gestor_matricula</code>. Área pelo código ou nome, unidade e cargo pelo nome como cadastrados em Estrutura, admissão em dd/mm/aaaa. Gestor é opcional. Cada pessoa recebe um convite por e-mail para criar a senha.
      </Alert>
      <div className="flex flex-wrap gap-2">
        <a href={templateHref} download="modelo-colaboradores.csv" className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line-strong px-4 font-semibold text-ink hover:bg-canvas">
          <Download className="size-5" aria-hidden /> Baixar modelo
        </a>
        <label className={cn("inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] bg-brand-700 px-4 font-semibold text-white hover:bg-brand-800", busy && "pointer-events-none opacity-60")}>
          <FileSpreadsheet className="size-5" aria-hidden /> {csv ? "Escolher outra planilha" : "Escolher planilha (.csv)"}
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => load(e.target.files?.[0])} />
        </label>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
      {report && (
        <section aria-labelledby="import-res">
          <h2 id="import-res" className="text-lg font-bold text-ink">
            {done ? `${report.created} de ${report.total} colaboradores cadastrados` : `${fileName}: ${report.valid} de ${report.total} linhas prontas para importar`}
          </h2>
          {!done && report.valid < report.total && <p className="text-sm text-muted">Linhas com erro não são importadas. Corrija na planilha e escolha o arquivo de novo, ou importe só as válidas.</p>}
          <ul className="mt-3 max-h-[28rem] divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {report.rows.map((r) => (
              <li key={r.line} className={cn("flex items-start gap-3 px-3 py-2 text-sm", !r.ok && "bg-red-50/60")}>
                <span className="w-16 shrink-0 font-mono text-muted">linha {r.line}</span>
                <span className="flex-1 text-ink">{r.message}</span>
                {r.ok ? <Badge tone="green">{done ? "Cadastrado" : "OK"}</Badge> : <Badge tone="red">Erro</Badge>}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {!done && report.valid > 0 && (
              <Button onClick={() => run(csv!, false)} loading={busy} icon={<Upload className="size-5" aria-hidden />}>
                Importar {report.valid} {report.valid === 1 ? "colaborador" : "colaboradores"}
              </Button>
            )}
            {done && (
              <ButtonLink href="/rh/colaboradores" icon={<CircleCheck className="size-5" aria-hidden />}>
                Ver colaboradores
              </ButtonLink>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
