import type { Metadata } from "next";

import { TrpcProvider } from "@/lib/trpc/Provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "ProspectAI",
  description: "Inteligencia comercial para encontrar oportunidades reais.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
