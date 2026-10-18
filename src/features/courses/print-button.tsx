"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()} icon={<Printer className="size-5" aria-hidden />} className="print:hidden">
      Imprimir ou salvar em PDF
    </Button>
  );
}
