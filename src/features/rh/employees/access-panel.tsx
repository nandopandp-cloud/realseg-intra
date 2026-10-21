"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, LockOpen, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/form";
import { Alert, Badge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";
import { fmtDateTime } from "@/lib/format";
import { TemporaryPassword } from "./employee-form";

const STATUS = [
  { value: "ativo", label: "Ativo", text: "Acesso normal." },
  { value: "afastado", label: "Afastado", text: "Mantém o acesso (ex.: licença), aparece como afastado nos relatórios." },
  { value: "desligado", label: "Desligado", text: "Acesso bloqueado imediatamente; histórico e documentos são preservados." },
];
const ROLES = [
  { key: "RH", label: "Recursos Humanos" },
  { key: "GESTOR", label: "Gestor" },
  { key: "ADMIN", label: "Administrador" },
];

/** Situação do vínculo, acesso (senha temporária, convite, desbloqueio) e papéis. */
export function AccessPanel({
  id,
  name,
  status,
  roles,
  locked,
  lastLoginAt,
  mustChangePassword,
  activeSessions,
  canManage,
  canManageRoles,
}: {
  id: string;
  name: string;
  status: string;
  roles: string[];
  locked: boolean;
  lastLoginAt: Date | null;
  mustChangePassword: boolean;
  activeSessions: number;
  canManage: boolean;
  canManageRoles: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [newStatus, setNewStatus] = useState(status);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [roleSel, setRoleSel] = useState(roles.filter((r) => r !== "COLABORADOR"));

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    setError(null);
    try {
      const r = (await fn()) as { temporaryPassword?: string | null } | undefined;
      if (r?.temporaryPassword) setTemp(r.temporaryPassword);
      toast("success", ok);
      setConfirmStatus(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir.");
      setConfirmStatus(false);
    } finally {
      setBusy(null);
    }
  }

  const statusInfo = STATUS.find((s) => s.value === newStatus);
  return (
    <div className="flex flex-col gap-5">
      {error && <Alert kind="error">{error}</Alert>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted">Último acesso</dt>
        <dd>{lastLoginAt ? fmtDateTime(lastLoginAt) : "Nunca entrou"}</dd>
        <dt className="text-muted">Sessões ativas</dt>
        <dd>{activeSessions}</dd>
        <dt className="text-muted">Senha</dt>
        <dd>{mustChangePassword ? "Troca obrigatória no próximo acesso" : "Definida pelo colaborador"}</dd>
        {locked && (
          <>
            <dt className="text-muted">Conta</dt>
            <dd>
              <Badge tone="red">Bloqueada por tentativas</Badge>
            </dd>
          </>
        )}
      </dl>

      {canManage && (
        <>
          <section aria-labelledby="ap-status">
            <h3 id="ap-status" className="text-sm font-semibold text-ink">
              Situação do vínculo
            </h3>
            <div className="mt-2 flex gap-2">
              <Select aria-labelledby="ap-status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Button variant="outline" disabled={newStatus === status} onClick={() => setConfirmStatus(true)}>
                Aplicar
              </Button>
            </div>
            {statusInfo && <p className="mt-1 text-sm text-muted">{statusInfo.text}</p>}
          </section>

          {status !== "desligado" && (
            <section aria-labelledby="ap-access" className="flex flex-col gap-2">
              <h3 id="ap-access" className="text-sm font-semibold text-ink">
                Acesso
              </h3>
              <Button variant="outline" size="sm" icon={<KeyRound className="size-4" aria-hidden />} loading={busy === "temp"} onClick={() => run("temp", () => api(`/rh/employees/${id}/access`, { json: { mode: "temp" } }), "Senha temporária gerada.")}>
                Gerar senha temporária
              </Button>
              <Button variant="outline" size="sm" icon={<Mail className="size-4" aria-hidden />} loading={busy === "invite"} onClick={() => run("invite", () => api(`/rh/employees/${id}/access`, { json: { mode: "invite" } }), "Link para definir senha enviado por e-mail.")}>
                Enviar link por e-mail
              </Button>
              {locked && (
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <LockOpen className="size-4" aria-hidden /> Qualquer uma das opções também desbloqueia a conta.
                </p>
              )}
            </section>
          )}
        </>
      )}

      {canManageRoles && (
        <section aria-labelledby="ap-roles">
          <h3 id="ap-roles" className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ShieldCheck className="size-4" aria-hidden /> Papéis
          </h3>
          <ul className="mt-2 flex flex-col gap-1">
            {ROLES.map((r) => (
              <li key={r.key}>
                <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={roleSel.includes(r.key)} onChange={(e) => setRoleSel((x) => (e.target.checked ? [...x, r.key] : x.filter((k) => k !== r.key)))} className="size-5 accent-[var(--color-brand-700)]" />
                  {r.label}
                </label>
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            className="mt-1"
            loading={busy === "roles"}
            disabled={JSON.stringify([...roleSel].sort()) === JSON.stringify(roles.filter((r) => r !== "COLABORADOR").sort())}
            onClick={() => run("roles", () => api(`/rh/employees/${id}/roles`, { method: "PUT", json: { roles: roleSel } }), "Papéis atualizados.")}
          >
            Salvar papéis
          </Button>
        </section>
      )}

      <Dialog open={!!temp} onClose={() => setTemp(null)} title="Senha temporária gerada" footer={<Button onClick={() => setTemp(null)}>Concluir</Button>}>
        {temp && <TemporaryPassword password={temp} name={name} />}
      </Dialog>
      <ConfirmDialog
        open={confirmStatus}
        onClose={() => setConfirmStatus(false)}
        onConfirm={() => run("status", () => api(`/rh/employees/${id}/status`, { json: { status: newStatus } }), `Situação alterada para ${statusInfo?.label}.`)}
        loading={busy === "status"}
        tone={newStatus === "desligado" ? "danger" : "primary"}
        title={`Alterar situação para “${statusInfo?.label}”?`}
        description={statusInfo?.text}
        confirmLabel="Confirmar"
      />
    </div>
  );
}
