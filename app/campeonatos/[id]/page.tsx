import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import {
  CAMP_CANCELADO,
  CAMP_ENCERRADO,
  INSC_APROVADA,
  formatarData,
  formatarPremio,
  limitesDoJogo,
  statusCampeonato,
} from '@/lib/regras';
import Header from '@/app/components/Header';
import Avatar from '@/app/components/Avatar';
import Chaveamento from '@/app/components/Chaveamento';
import FormInscricao from './FormInscricao';
import { ui } from '@/lib/ui';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ time?: string }>;
};

export default async function CampeonatoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { time: timeSugerido } = await searchParams;

  // Página pública: quem não está logado também pode ver
  const user = await getCurrentUser().catch(() => null);

  const campeonato = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { createdAt: 'asc' },
        include: { team: { include: { _count: { select: { players: true } } } } },
      },
      matches: { orderBy: [{ round: 'asc' }, { position: 'asc' }] },
    },
  });
  if (!campeonato) notFound();

  const aprovadas = campeonato.registrations.filter((r) => r.status === INSC_APROVADA);
  const status = statusCampeonato(campeonato, aprovadas.length);
  const idsInscritos = new Set(campeonato.registrations.map((r) => r.teamId));
  const minhasInscricoes = user ? campeonato.registrations.filter((r) => r.team.userId === user.id) : [];

  // Meus times do mesmo jogo que ainda NÃO estão inscritos
  let timesDisponiveis: { id: string; name: string; jogadores: number; minimo: number }[] = [];
  if (user && status.aberto) {
    const meusTimes = await prisma.team.findMany({
      where: { userId: user.id, game: campeonato.game },
      orderBy: { name: 'asc' },
      include: { _count: { select: { players: true } } },
    });
    const minimo = limitesDoJogo(campeonato.game).min;
    timesDisponiveis = meusTimes
      .filter((t) => !idsInscritos.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, jogadores: t._count.players, minimo }));
  }

  const encerrado = campeonato.status === CAMP_ENCERRADO;
  const cancelado = campeonato.status === CAMP_CANCELADO;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">← Todos os campeonatos</Link>

        {/* Dados do campeonato */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {campeonato.imageUrl && (
            <div className="h-48 bg-slate-950">
              <img src={campeonato.imageUrl} alt={campeonato.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-950/80 text-indigo-400 px-2 py-1 rounded border border-indigo-500/30">
                {campeonato.game}
              </span>
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${status.classe}`}>
                {status.rotulo}
              </span>
            </div>

            <h1 className="text-2xl font-bold break-words">{campeonato.name}</h1>
            {campeonato.description && <p className="text-sm text-slate-300 mt-3">{campeonato.description}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">INÍCIO</span>
                <span className="font-semibold text-slate-200">{formatarData(campeonato.startDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">INSCRIÇÕES ATÉ</span>
                <span className="font-semibold text-slate-200">{formatarData(campeonato.registrationDeadline)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PREMIAÇÃO</span>
                <span className="font-semibold text-emerald-400">{formatarPremio(campeonato.prize)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">VAGAS</span>
                <span className="font-semibold text-slate-200">{aprovadas.length}/{campeonato.maxTeams} times</span>
              </div>
            </div>
          </div>
        </section>

        {cancelado && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl">
            Este campeonato foi cancelado pela administração.
          </div>
        )}

        {/* Campeão e vice */}
        {encerrado && campeonato.championName && (
          <section className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5 md:p-6">
            <h2 className="text-lg font-bold text-amber-400 mb-4">Resultado final</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-950/60 border border-amber-500/30 rounded-xl p-4">
                <span className="text-[10px] uppercase tracking-wider text-amber-400">🏆 Campeão</span>
                <p className="text-lg font-bold mt-1 break-words">{campeonato.championName}</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-700 rounded-xl p-4">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">🥈 Vice-campeão</span>
                <p className="text-lg font-bold mt-1 break-words">{campeonato.runnerUpName}</p>
              </div>
            </div>
          </section>
        )}

        {/* Chaveamento */}
        {campeonato.matches.length > 0 && (
          <section className={ui.card}>
            <h2 className="text-lg font-bold mb-4">Chaveamento</h2>
            <Chaveamento partidas={campeonato.matches} />
          </section>
        )}

        {/* Inscrição */}
        {!encerrado && !cancelado && campeonato.matches.length === 0 && (
          <section className={ui.card}>
            <h2 className="text-lg font-bold mb-4">Inscrição</h2>

            {minhasInscricoes.length > 0 && (
              <ul className="mb-4 space-y-2">
                {minhasInscricoes.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm bg-slate-950/60 border border-slate-800/60 rounded-lg px-3 py-2"
                  >
                    <span className="truncate">{r.team.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                        r.status === INSC_APROVADA
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                      }`}
                    >
                      {r.status === INSC_APROVADA ? 'Aprovada' : 'Aguardando aprovação'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {!status.aberto ? (
              <div className={ui.vazio}>
                <p className="text-slate-400 text-sm">
                  {status.chave === 'PRAZO'
                    ? 'O prazo de inscrição terminou. A administração vai sortear o chaveamento em breve.'
                    : status.chave === 'LOTADO'
                      ? 'Todas as vagas foram preenchidas.'
                      : 'As inscrições não estão abertas.'}
                </p>
              </div>
            ) : !user ? (
              <div className={ui.vazio}>
                <p className="text-slate-400 text-sm">Entre na sua conta para inscrever o seu time.</p>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  <Link href="/login" className={ui.botaoSecundario}>Entrar</Link>
                  <Link href="/cadastro" className={ui.botaoPrimario}>Criar conta</Link>
                </div>
              </div>
            ) : (
              <FormInscricao
                campeonatoId={campeonato.id}
                jogo={campeonato.game}
                times={timesDisponiveis}
                timeInicial={timeSugerido}
              />
            )}
          </section>
        )}

        {/* Times inscritos (só os aprovados aparecem para todo mundo) */}
        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">
            Times participantes{' '}
            <span className="text-sm font-normal text-slate-500">({aprovadas.length})</span>
          </h2>

          {aprovadas.length === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Nenhum time aprovado ainda.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {aprovadas.map((inscricao, i) => (
                <li
                  key={inscricao.id}
                  className="flex items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/60 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-5 shrink-0">{i + 1}</span>
                    <Avatar src={inscricao.team.logoUrl} nome={inscricao.team.name} tamanho="sm" />
                    <Link
                      href={`/equipes/${inscricao.team.id}`}
                      className="font-medium truncate hover:text-indigo-400"
                    >
                      {inscricao.team.name}
                    </Link>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {inscricao.team._count.players}{' '}
                    {inscricao.team._count.players === 1 ? 'jogador' : 'jogadores'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
