import { prisma } from "@prospectai/database";
import type { User } from "@supabase/supabase-js";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "organizacao"
  );
}

/**
 * Garante que o usuario autenticado tem uma Organization + Member.
 *
 * Autoprovisiona no primeiro acesso caso ainda nao exista — cobre tanto
 * o cadastro normal quanto usuarios que confirmam o e-mail depois (sem
 * sessao ativa no momento do signUp) ou contas criadas fora do fluxo de
 * registro (ex.: diretamente no painel do Supabase).
 */
export async function ensureOrganizationId(user: User): Promise<string> {
  const existing = await prisma.member.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  if (existing) {
    return existing.organizationId;
  }

  const name =
    (user.user_metadata.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Usuario";

  const slug = `${slugify(name)}-${user.id.slice(0, 8)}`;

  try {
    const organization = await prisma.organization.create({
      data: {
        name: `Organização de ${name}`,
        slug,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    return organization.id;
  } catch {
    // Corrida entre requisicoes concorrentes: outra ja criou a organizacao.
    const retryExisting = await prisma.member.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    if (retryExisting) {
      return retryExisting.organizationId;
    }

    throw new Error(`Falha ao provisionar organizacao para o usuario ${user.id}`);
  }
}
