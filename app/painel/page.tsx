import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import { INSC_APROVADA, formatarData } from '@/lib/regras';
import Header from '@/app/components/Header';
import Avatar from '@/app/components/Avatar';
import { ui } from '@/lib/ui';

export default async function PainelPage() {
  // Proteção feita NO SERVIDOR: sem login, ninguém vê esta página
  const user = await exigirUsuario();

  // Só busca dados DESTE usuário
  const [conta, meusTimes, inscricoes] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
    prisma.team.findMany({
      where: { OR: [{ userId: user.id }, { players: { some: { userId: user.id } } }] },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { players: true } } },
    }),
    prisma.registration.findMany({
      where: { team: { userId: user.id } },
      orderBy: { createdAt: 'desc' },
      include: { team: { select: { name: true } }, tournament: true },
    }),
  ]);

  const timesDoUsuario = meusTimes.filter((t) => t.userId === user.id);
  const totalJogadores = timesDoUsuario.reduce((soma, t) => soma + t._count.players, 0);
  const membroDesde = conta?.createdAt.toLocaleDateString('pt-BR');
  const inicial = user.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Meu painel</h1>

        {/* Informações da conta */}
        <section className={`${ui.card} flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold">
              {inicial}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold truncate">{user.name}</p>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
              {membroDesde && <p className="text-xs text-slate-500 mt-1">Membro desde {membroDesde}</p>}
            </div>
          </div>
          <Link href="/conta" className={ui.botaoSecundario}>Editar conta</Link>
        </section>

        {/* Resumo */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Times</span>
            <p className="text-3xl font-bold text-indigo-400 mt-1">{meusTimes.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Jogadores</span>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{totalJogadores}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Inscrições</span>
            <p className="text-3xl font-bold text-amber-400 mt-1">{inscricoes.length}</p>
          </div>
        </section>

        {/* Meus times */}
        <section className={ui.card}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold">Meus times</h2>
            <Link href="/times" className={ui.botaoSecundario}>Gerenciar times</Link>
          </div>

          {meusTimes.length === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Você ainda não faz parte de nenhum time.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <Link href="/times/novo" className={ui.botaoPrimario}>Criar time</Link>
                <Link href="/times/entrar" className={ui.botaoSecundario}>Entrar com código</Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {meusTimes.map((time) => (
                <li key={time.id}>
                  <Link
                    href={`/times/${time.id}`}
                    className="flex items-center justify-between gap-3 bg-slate-950/60 hover:border-indigo-500/50 border border-slate-800/60 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={time.logoUrl} nome={time.name} tamanho="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{time.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {time.game} · {time.userId === user.id ? 'Dono' : 'Jogador'}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded">
                      {time._count.players} {time._count.players === 1 ? 'jogador' : 'jogadores'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Campeonatos em que meus times estão inscritos */}
        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">Meus campeonatos</h2>

          {inscricoes.length === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Nenhum dos seus times está inscrito em campeonatos.</p>
              <Link href="/" className="inline-block mt-3 text-sm text-indigo-400 hover:underline">
                Ver campeonatos abertos
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {inscricoes.map((inscricao) => (
                <li key={inscricao.id}>
                  <Link
                    href={`/campeonatos/${inscricao.tournament.id}`}
                    className="flex items-center justify-between gap-3 bg-slate-950/60 hover:border-indigo-500/50 border border-slate-800/60 rounded-xl p-4 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{inscricao.tournament.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        Time: {inscricao.team.name} · Início: {formatarData(inscricao.tournament.startDate)}
                      </p>
                      <span
                        className={`inline-block mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                          inscricao.status === INSC_APROVADA
                            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                            : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                        }`}
                      >
                        {inscricao.status === INSC_APROVADA ? 'Aprovada' : 'Aguardando aprovação'}
                      </span>
                    </div>
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
