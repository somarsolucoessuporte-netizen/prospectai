export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <footer className="border-t p-4 text-center text-xs text-gray-400">
        Desenvolvido por Somar Solucoes Digitais
      </footer>
    </div>
  );
}
