"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api-client";

export function CancelSubmissionButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  async function confirm() {
    setBusy(true);
    try {
      await api(`/submissions/${id}/cancel`, { method: "POST" });
      toast("success", "Envio cancelado.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Não foi possível cancelar.");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Cancelar envio
      </Button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={confirm} loading={busy} tone="danger" title="Cancelar este envio?" description="O RH não analisará este documento. Se precisar, você poderá enviá-lo novamente." confirmLabel="Sim, cancelar envio" />
    </>
  );
}
