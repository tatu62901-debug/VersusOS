import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { JOGOS } from '@/lib/regras';
import Header from '@/app/components/Header';
import Avatar from '@/app/components/Avatar';
import { ui } from '@/lib/ui';

const POR_PAGINA = 12;

type Props = {
  searchParams: Promise<{ busca?: string; jogo?: string; pagina?: string }>;
};

// Monta o endereço mantendo busca e filtro (usado nos botões de paginação)
function montarLink(busca: string, jogo: string, pagina: number) {
  const params = new URLSearchParams();
  if (busca) params.set('busca', busca);
  if (jogo) params.set('jogo', jogo);
  if (pagina > 1) params.set('pagina', String(pagina));
  const texto = params.toString();
  return texto ? `/equipes?${texto}` : '/equipes';
}

// Página PÚBLICA: lista todos os times com os seus jogadores.
// Dados pessoais (idade, código de convite) NÃO aparecem aqui.
export default async function EquipesPage({ searchParams }: Props) {
  const filtros = await searchParams;
  const busca = filtros.busca?.trim().slice(0, 60) ?? '';
  const jogo = (JOGOS as readonly string[]).includes(filtros.jogo ?? '') ? filtros.jogo! : '';
  const paginaPedida = Number.parseInt(filtros.pagina ?? '1', 10);

  const user = await getCurrentUser().catch(() => null);

  // Busca pelo nome do time ou pelo nickname de algum jogador, e filtro por jogo
  const where = {
    ...(jogo ? { game: jogo } : {}),
    ...(busca
      ? {
          OR: [
            { name: { contains: busca, mode: 'insensitive' as const } },
            { players: { some: { nickname: { contains: busca, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.team.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Number.isInteger(paginaPedida) ? Math.min(Math.max(paginaPedida, 1), totalPaginas) : 1;

  const times = await prisma.team.findMany({
    where,
    orderBy: { name: 'asc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
    include: {
      players: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, nickname: true, role: true, avatarUrl: true },
      },
      _count: { select: { registrations: true } },
    },
  });

  const temFiltro = busca !== '' || jogo !== '';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Times</h1>
          <p className="text-sm text-slate-400 mt-1">
            Conheça os times cadastrados e os jogadores de cada um.
          </p>
        </div>

        {/* Busca e filtro (pelo endereço: /equipes?busca=...&jogo=...) */}
        <form method="GET" className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            name="busca"
            defaultValue={busca}
            placeholder="Buscar por time ou jogador..."
            className={`${ui.campo} sm:flex-1 min-w-0`}
          />
          <select name="jogo" defaultValue={jogo} className={`${ui.campo} sm:w-56`}>
            <option value="">Todos os jogos</option>
            {JOGOS.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
          <button type="submit" className={ui.botaoPrimario}>Buscar</button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400 font-mono">
            {total} time(s) encontrado(s)
          </span>
          {temFiltro && (
            <Link href="/equipes" className="text-sm text-indigo-400 hover:underline">
              Limpar filtros
            </Link>
          )}
        </div>

        {times.length === 0 ? (
          <div className={ui.vazio}>
            <p className="text-slate-400 font-medium">
              {temFiltro
                ? 'Nenhum time foi encontrado com os filtros informados.'
                : 'Ainda não há times cadastrados.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {times.map((time) => (
              <section key={time.id} className={`${ui.card} flex flex-col`}>
                <Link href={`/equipes/${time.id}`} className="flex items-center gap-3 group">
                  <Avatar src={time.logoUrl} nome={time.name} tamanho="md" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold truncate group-hover:text-indigo-400 transition-colors">
                      {time.name}
                    </h2>
                    <p className="text-sm text-indigo-400 truncate">{time.game}</p>
                    <p className="text-xs text-slate-500">
                      {time.players.length} {time.players.length === 1 ? 'jogador' : 'jogadores'} ·{' '}
                      {time._count.registrations}{' '}
                      {time._count.registrations === 1 ? 'campeonato' : 'campeonatos'}
                    </p>
                  </div>
                </Link>

                {time.players.length === 0 ? (
                  <p className="text-xs text-slate-500 mt-4">Este time ainda não tem jogadores.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {time.players.map((jogador) => (
                      <li
                        key={jogador.id}
                        className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/60 rounded-lg px-3 py-2"
                      >
                        <Avatar src={jogador.avatarUrl} nome={jogador.nickname} tamanho="sm" className="!w-8 !h-8 !text-xs" />
                        <span className="font-medium truncate">{jogador.nickname}</span>
                        <span className="ml-auto shrink-0 text-xs text-slate-400 truncate max-w-[40%]">
                          {jogador.role}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <nav className="flex items-center justify-between gap-3 pt-2">
            {pagina > 1 ? (
              <Link href={montarLink(busca, jogo, pagina - 1)} className={ui.botaoSecundario}>
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-400">
              Página {pagina} de {totalPaginas}
            </span>
            {pagina < totalPaginas ? (
              <Link href={montarLink(busca, jogo, pagina + 1)} className={ui.botaoSecundario}>
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
