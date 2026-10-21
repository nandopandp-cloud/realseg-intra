"use client";

import { useRouter } from "next/navigation";
import { EmployeePicker, type PickedEmployee } from "./employee-picker";

/** Seletor de colaborador que navega para `${base}${id}` ao escolher (ex.: plano de desenvolvimento). */
export function EmployeeJump({ base, value, label }: { base: string; value: PickedEmployee | null; label: string }) {
  const router = useRouter();
  return <EmployeePicker label={label} value={value} onChange={(e) => router.push(e ? `${base}${e.id}` : base.replace(/[?&]colaborador=$/, ""))} />;
}
