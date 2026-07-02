import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureOrganizationId } from "@/server/organization";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await ensureOrganizationId(user);
  } catch (error) {
    // Nao derruba a pagina inteira por uma falha pontual de provisionamento —
    // as rotas tRPC ja tratam organizationId nulo de forma graciosa.
    console.error("[dashboard layout] Falha ao garantir organizacao:", error);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <footer className="border-t p-4 text-center text-xs text-gray-400">
        Desenvolvido por Somar Solucoes Digitais
      </footer>
    </div>
  );
}
