"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";

export function MarkAllRead() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      variant="outline"
      loading={busy}
      icon={<CheckCheck className="size-5" aria-hidden />}
      onClick={async () => {
        setBusy(true);
        await api("/notifications/read-all", { method: "POST" }).catch(() => {});
        setBusy(false);
        router.refresh();
      }}
    >
      Marcar todas como lidas
    </Button>
  );
}

export function NotificationLink({ id, href, unread, children }: { id: string; href: string; unread: boolean; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="block w-full text-left"
      onClick={async () => {
        if (unread) await api(`/notifications/${id}/read`, { method: "POST" }).catch(() => {});
        router.push(href);
        router.refresh();
      }}
    >
      {children}
    </button>
  );
}

export function NotificationPreferences({ prefs }: { prefs: Array<{ category: string; label: string; inApp: boolean; mandatory: boolean }> }) {
  const [state, setState] = useState(prefs);
  const toast = useToast();
  async function toggle(category: string, inApp: boolean) {
    const prev = state;
    setState((s) => s.map((p) => (p.category === category ? { ...p, inApp } : p)));
    try {
      await api("/me/preferences", { method: "PATCH", json: { notification: { category, inApp } } });
      toast("success", "Preferência salva.");
    } catch (err) {
      setState(prev);
      toast("error", err instanceof ApiError ? err.message : "Não foi possível salvar.");
    }
  }
  return (
    <div className="divide-y divide-line">
      {state.map((p) => (
        <Switch
          key={p.category}
          label={p.label}
          description={p.mandatory ? "Avisos de segurança da conta são sempre enviados." : undefined}
          checked={p.inApp}
          disabled={p.mandatory}
          onChange={(v) => toggle(p.category, v)}
        />
      ))}
    </div>
  );
}
