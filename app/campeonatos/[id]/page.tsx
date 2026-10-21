import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { formatarData, formatarPremio, statusCampeonato } from '@/lib/regras';
import Header from '@/app/components/Header';
import Avatar from '@/app/components/Avatar';
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
    },
  });
  if (!campeonato) notFound();

  const inscritos = campeonato.registrations.length;
  const status = statusCampeonato(campeonato, inscritos);
  const idsInscritos = new Set(campeonato.registrations.map((r) => r.teamId));

  // Meus times do mesmo jogo que ainda NÃO estão inscritos
  let timesDisponiveis: { id: string; name: string }[] = [];
  if (user) {
    const meusTimes = await prisma.team.findMany({
      where: { userId: user.id, game: campeonato.game },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    timesDisponiveis = meusTimes.filter((t) => !idsInscritos.has(t.id));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href="/" className="text-sm text-slate-400 hover:text-white">← Todos os campeonatos</Link>

        {/* Dados do campeonato */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {campeonato.imageUrl && (
            <div className="h-48 bg-slate-950">
              <img
                src={campeonato.imageUrl}
                alt={campeonato.name}
                className="w-full h-full object-cover"
              />
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
            {campeonato.description && (
              <p className="text-sm text-slate-300 mt-3">{campeonato.description}</p>
            )}

            <div className="grid grid-cols-3 gap-3 mt-6 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">INÍCIO</span>
                <span className="font-semibold text-slate-200">{formatarData(campeonato.startDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PREMIAÇÃO</span>
                <span className="font-semibold text-emerald-400">{formatarPremio(campeonato.prize)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">VAGAS</span>
                <span className="font-semibold text-slate-200">{inscritos}/{campeonato.maxTeams} times</span>
              </div>
            </div>
          </div>
        </section>

        {/* Inscrição */}
        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">Inscrição</h2>

          {!status.aberto ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">
                {status.rotulo === 'Encerrado'
                  ? 'As inscrições deste campeonato já foram encerradas.'
                  : 'Este campeonato não tem mais vagas.'}
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

        {/* Times inscritos */}
        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">Times inscritos</h2>

          {inscritos === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Nenhum time inscrito ainda. Seja o primeiro!</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {campeonato.registrations.map((inscricao, i) => (
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
