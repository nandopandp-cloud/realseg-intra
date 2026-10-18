import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { connection } from "next/server";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "Intranet REALSEG", template: "%s | Intranet REALSEG" },
  description: "Intranet corporativa REALSEG — Security Intelligence.",
  robots: { index: false, follow: false },
  icons: { apple: "/brand/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // CSP com nonce exige renderização por requisição em todas as páginas (ADR-0006).
  await connection();
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-surface antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
