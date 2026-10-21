import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import Header from '@/app/components/Header';
import FormPerfil from './FormPerfil';
import FormSenha from './FormSenha';
import FormExcluirConta from './FormExcluirConta';
import { ui } from '@/lib/ui';

export default async function ContaPage() {
  const user = await exigirUsuario();

  // Times que a pessoa é dona: ela precisa resolver isso antes de excluir a conta
  const timesDoUsuario = await prisma.team.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <Link href="/painel" className="text-sm text-slate-400 hover:text-white">← Meu painel</Link>
        <h1 className="text-2xl font-bold">Minha conta</h1>

        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">Perfil</h2>
          <FormPerfil nome={user.name} email={user.email} />
        </section>

        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-1">Trocar senha</h2>
          <p className="text-xs text-slate-400 mb-4">
            Ao trocar a senha, os outros aparelhos conectados à sua conta são desconectados.
          </p>
          <FormSenha />
        </section>

        <section className="bg-slate-900 border border-red-500/30 rounded-2xl p-5 md:p-6">
          <h2 className="text-lg font-bold text-red-400 mb-1">Excluir conta</h2>
          <p className="text-xs text-slate-400 mb-4">
            Remove a sua conta e tira você dos times em que joga. Isso não pode ser desfeito.
          </p>

          {timesDoUsuario.length > 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-300 text-sm">
                Você é dono {timesDoUsuario.length === 1 ? 'do time' : 'dos times'}{' '}
                <span className="font-semibold">{timesDoUsuario.map((t) => t.name).join(', ')}</span>.
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Para excluir a conta, passe a liderança para outro jogador ou exclua{' '}
                {timesDoUsuario.length === 1 ? 'o time' : 'os times'} antes.
              </p>
              <Link href="/times" className="inline-block mt-3 text-sm text-indigo-400 hover:underline">
                Ir para Meus times
              </Link>
            </div>
          ) : (
            <FormExcluirConta />
          )}
        </section>
      </div>
    </main>
  );
}
