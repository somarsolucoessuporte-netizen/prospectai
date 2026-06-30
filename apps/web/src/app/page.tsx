import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">ProspectAI</h1>
      <p className="text-sm text-gray-500">
        Inteligencia comercial para encontrar oportunidades reais.
      </p>
      <Link href="/login" className="text-blue-600 underline">
        Entrar
      </Link>
      <footer className="absolute bottom-4 text-xs text-gray-400">
        Desenvolvido por Somar Solucoes Digitais
      </footer>
    </main>
  );
}
