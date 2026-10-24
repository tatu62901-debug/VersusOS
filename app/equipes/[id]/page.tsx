import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { INSC_APROVADA, formatarData } from '@/lib/regras';
import Header from '@/app/components/Header';
import Avatar from '@/app/components/Avatar';
import { ui } from '@/lib/ui';

type Props = {
  params: Promise<{ id: string }>;
};

// Página PÚBLICA do time: qualquer pessoa pode ver (sem login).
// Dados pessoais (idade, código de convite) NÃO aparecem aqui.
export default async function EquipePublicaPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser().catch(() => null);

  const time = await prisma.team.findUnique({
    where: { id },
    include: {
      players: { orderBy: { createdAt: 'asc' }, select: { id: true, nickname: true, role: true, avatarUrl: true, userId: true } },
      registrations: {
        where: { status: INSC_APROVADA },
        orderBy: { createdAt: 'desc' },
        include: { tournament: { select: { id: true, name: true, startDate: true } } },
      },
    },
  });
  if (!time) notFound();

  const fazParte = !!user && (time.userId === user.id || time.players.some((j) => j.userId === user.id));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">← Início</Link>

        <section className={ui.card}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <Avatar src={time.logoUrl} nome={time.name} tamanho="lg" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold break-words">{time.name}</h1>
                <p className="text-sm text-indigo-400 mt-1">{time.game}</p>
              </div>
            </div>
            {fazParte && (
              <Link href={`/times/${time.id}`} className={ui.botaoSecundario}>
                Gerenciar time
              </Link>
            )}
          </div>
          {time.description && (
            <p className="text-sm text-slate-300 mt-4 break-words">{time.description}</p>
          )}
        </section>

        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">
            Elenco{' '}
            <span className="text-sm font-normal text-slate-500">({time.players.length})</span>
          </h2>

          {time.players.length === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Este time ainda não tem jogadores.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {time.players.map((jogador) => (
                <li
                  key={jogador.id}
                  className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/60 rounded-xl p-3"
                >
                  <Avatar src={jogador.avatarUrl} nome={jogador.nickname} tamanho="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{jogador.nickname}</p>
                    <p className="text-xs text-slate-400 truncate">{jogador.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">Campeonatos</h2>

          {time.registrations.length === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Este time ainda não está inscrito em nenhum campeonato.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {time.registrations.map((inscricao) => (
                <li key={inscricao.id}>
                  <Link
                    href={`/campeonatos/${inscricao.tournament.id}`}
                    className="flex items-center justify-between gap-3 bg-slate-950/60 hover:border-indigo-500/50 border border-slate-800/60 rounded-xl px-4 py-3 transition-colors"
                  >
                    <span className="font-medium truncate">{inscricao.tournament.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatarData(inscricao.tournament.startDate)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
