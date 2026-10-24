import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import { limitesDoJogo } from '@/lib/regras';
import Header from '@/app/components/Header';
import FormJogador from '@/app/times/FormJogador';
import { ui } from '@/lib/ui';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function NovoJogadorPage({ params }: Props) {
  const { id } = await params;
  const user = await exigirUsuario();

  const time = await prisma.team.findUnique({
    where: { id },
    include: { players: { select: { userId: true } } },
  });
  if (!time || time.userId !== user.id) notFound();

  const maxJogadores = limitesDoJogo(time.game).max;
  const lotado = time.players.length >= maxJogadores;
  const donoJaNoElenco = time.players.some((j) => j.userId === user.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className={ui.card}>
          <h1 className="text-xl font-bold mb-1">Adicionar jogador</h1>
          <p className="text-xs text-slate-400 mb-6">Time: {time.name}</p>

          {lotado ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">
                O elenco de {time.game} comporta no máximo {maxJogadores} jogador(es).
              </p>
              <Link href={`/times/${time.id}`} className="inline-block mt-3 text-sm text-indigo-400 hover:underline">
                Voltar para o time
              </Link>
            </div>
          ) : (
            <FormJogador timeId={time.id} podeVincularEu={!donoJaNoElenco} />
          )}
        </div>
      </div>
    </main>
  );
}
