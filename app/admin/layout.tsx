import { exigirAdmin } from '@/lib/permissoes';
import Header from '@/app/components/Header';
import AdminNav from './AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Quem não é admin recebe "página não encontrada"
  const admin = await exigirAdmin();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={admin} />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Administração</h1>
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10">
            Modo admin
          </span>
        </div>
        <AdminNav />
        {children}
      </div>
    </main>
  );
}
