import { exigirUsuario } from '@/lib/permissoes';
import Header from '@/app/components/Header';
import FormTime from '@/app/times/FormTime';
import { ui } from '@/lib/ui';

export default async function NovoTimePage() {
  const user = await exigirUsuario();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className={ui.card}>
          <h1 className="text-xl font-bold mb-1">Criar time</h1>
          <p className="text-xs text-slate-400 mb-6">
            Você será o dono do time e poderá gerenciar os jogadores e as inscrições.
          </p>
          <FormTime />
        </div>
      </div>
    </main>
  );
}
