import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { CAMP_ENCERRADO, INSC_APROVADA, formatarData, formatarPremio, statusCampeonato } from '@/lib/regras';
import Header from '@/app/components/Header';

interface Props {
  searchParams: Promise<{ busca?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { busca } = await searchParams;
  const termo = busca?.trim() || '';
  const user = await getCurrentUser().catch(() => null);

  // Página pública: lista os campeonatos do banco de dados (com filtro por ?busca=)
  const encontrados = await prisma.tournament.findMany({
    where: termo
      ? {
          OR: [
            { name: { contains: termo, mode: 'insensitive' } },
            { game: { contains: termo, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { startDate: 'asc' },
    include: {
      _count: { select: { registrations: { where: { status: INSC_APROVADA } } } },
    },
  });

  // Em andamento primeiro, depois inscrições abertas, depois encerrados e cancelados
  const prioridade: Record<string, number> = { EM_ANDAMENTO: 0, INSCRICOES: 1, ENCERRADO: 2, CANCELADO: 3 };
  const campeonatos = [...encontrados].sort(
    (a, b) =>
      (prioridade[a.status] ?? 9) - (prioridade[b.status] ?? 9) ||
      (a.status === CAMP_ENCERRADO ? b.startDate.getTime() - a.startDate.getTime() : a.startDate.getTime() - b.startDate.getTime())
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      {/* Hero Section */}
      <section className="px-4 py-12 text-center max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent mb-4">
          Gerencie e Dispute os Melhores Torneios de E-sports
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto mb-8">
          Acompanhe chaveamentos, premiações e monte sua equipe para dominar a cena competitiva.
        </p>

        {/* Busca por endereço (?busca=...) */}
        <form method="GET" className="max-w-md mx-auto flex gap-2">
          <input
            type="text"
            name="busca"
            defaultValue={termo}
            placeholder="Buscar por torneio ou jogo (ex: Valorant)..."
            className="flex-1 min-w-0 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition-colors"
          >
            Buscar
          </button>
        </form>
      </section>

      {/* Grade de campeonatos */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <h2 className="text-xl font-bold text-slate-200">Campeonatos em Destaque</h2>
          <span className="text-xs text-slate-400 font-mono">
            {campeonatos.length} campeonato(s) encontrado(s)
          </span>
        </div>

        {campeonatos.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800/60 my-6">
            <p className="text-slate-400 font-medium">
              {termo
                ? 'Nenhum campeonato foi encontrado com o termo informado.'
                : 'Ainda não há campeonatos cadastrados.'}
            </p>
            {termo && (
              <Link href="/" className="inline-block mt-3 text-sm text-indigo-400 hover:underline">
                Limpar filtro de busca
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {campeonatos.map((c) => {
              const status = statusCampeonato(c, c._count.registrations);
              return (
                <Link
                  key={c.id}
                  href={`/campeonatos/${c.id}`}
                  className="group bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col"
                >
                  <div className="h-36 overflow-hidden bg-slate-950 relative">
                    {c.imageUrl && (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold bg-slate-950/80 backdrop-blur text-indigo-400 px-2 py-1 rounded border border-indigo-500/30">
                      {c.game}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-slate-100 text-base mb-1 line-clamp-2">{c.name}</h3>
                      <p className="text-xs text-slate-400 mb-2">Início: {formatarData(c.startDate)}</p>
                      <span className={`inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${status.classe}`}>
                        {status.rotulo}
                      </span>
                      {c.status === CAMP_ENCERRADO && c.championName && (
                        <p className="text-xs text-amber-400 mt-2 truncate">🏆 Campeão: {c.championName}</p>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">PREMIAÇÃO</span>
                        <span className="font-semibold text-emerald-400">{formatarPremio(c.prize)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">VAGAS</span>
                        <span className="font-semibold text-slate-300">
                          {c._count.registrations}/{c.maxTeams}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        VersusOS &copy; 2026 - Plataforma de Campeonatos
      </footer>
    </main>
  );
}
