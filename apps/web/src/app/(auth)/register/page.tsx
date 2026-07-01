"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";

const ERROR_MESSAGES: Record<string, string> = {
  "User already registered": "Este e-mail já está cadastrado.",
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);

  const completeRegistration = trpc.auth.completeRegistration.useMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (signUpError) {
      setLoading(false);
      setError(ERROR_MESSAGES[signUpError.message] ?? signUpError.message);
      return;
    }

    if (!data.session) {
      // Projeto Supabase exige confirmacao de e-mail — ainda nao ha sessao ativa
      setLoading(false);
      setConfirmationPending(true);
      return;
    }

    try {
      await completeRegistration.mutateAsync({ name });
    } catch (mutationError) {
      setLoading(false);
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível concluir o cadastro."
      );
      return;
    }

    router.push("/prospects");
    router.refresh();
  };

  if (confirmationPending) {
    return (
      <div className="text-center">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Confirme seu e-mail</h2>
        <p className="text-sm text-gray-500">
          Enviamos um link de confirmação para <strong>{email}</strong>. Verifique sua caixa de
          entrada para ativar a conta e entrar.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Criar conta</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="voce@empresa.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
