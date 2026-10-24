import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirAdmin } from '@/lib/permissoes';
import Avatar from '@/app/components/Avatar';
import { ui } from '@/lib/ui';

const POR_PAGINA = 15;

type Props = {
  searchParams: Promise<{ busca?: string; pagina?: string }>;
};

function montarLink(busca: string, pagina: number) {
  const params = new URLSearchParams();
  if (busca) params.set('busca', busca);
  if (pagina > 1) params.set('pagina', String(pagina));
  const texto = params.toString();
  return texto ? `/admin/times?${texto}` : '/admin/times';
}

export default async function AdminTimesPage({ searchParams }: Props) {
  await exigirAdmin();
  const filtros = await searchParams;
  const busca = filtros.busca?.trim().slice(0, 60) ?? '';
  const paginaPedida = Number.parseInt(filtros.pagina ?? '1', 10);

  const where = busca
    ? {
        OR: [
          { name: { contains: busca, mode: 'insensitive' as const } },
          { game: { contains: busca, mode: 'insensitive' as const } },
          { user: { name: { contains: busca, mode: 'insensitive' as const } } },
          { user: { email: { contains: busca, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  const total = await prisma.team.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Number.isInteger(paginaPedida) ? Math.min(Math.max(paginaPedida, 1), totalPaginas) : 1;

  const times = await prisma.team.findMany({
    where,
    orderBy: { name: 'asc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { players: true, registrations: true } },
    },
  });

  return (
    <section className={ui.card}>
      <h2 className="text-lg font-bold mb-4">
        Times <span className="text-sm font-normal text-slate-500">({total})</span>
      </h2>

      <form method="GET" className="flex gap-2 mb-4">
        <input
          type="text"
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por time, jogo ou dono..."
          className={`${ui.campo} flex-1 min-w-0`}
        />
        <button type="submit" className={ui.botaoPrimario}>Buscar</button>
      </form>

      {times.length === 0 ? (
        <div className={ui.vazio}>
          <p className="text-slate-400 text-sm">Nenhum time encontrado.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {times.map((time) => (
            <li
              key={time.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/60 rounded-xl p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={time.logoUrl} nome={time.name} tamanho="sm" />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{time.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {time.game} · dono: {time.user.name} ({time.user.email})
                  </p>
                  <p className="text-xs text-slate-500">
                    {time._count.players} jogador(es) · {time._count.registrations} inscrição(ões)
                  </p>
                </div>
              </div>
              <Link href={`/admin/times/${time.id}`} className={ui.botaoSecundario}>Gerenciar</Link>
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 && (
        <nav className="flex items-center justify-between gap-3 pt-4">
          {pagina > 1 ? (
            <Link href={montarLink(busca, pagina - 1)} className={ui.botaoSecundario}>← Anterior</Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-slate-400">Página {pagina} de {totalPaginas}</span>
          {pagina < totalPaginas ? (
            <Link href={montarLink(busca, pagina + 1)} className={ui.botaoSecundario}>Próxima →</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
