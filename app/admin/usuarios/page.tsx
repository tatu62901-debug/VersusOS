import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirAdmin } from '@/lib/permissoes';
import { ehAdmin } from '@/lib/admin';
import { formatarData } from '@/lib/regras';
import { reativarUsuario, suspenderUsuario } from '@/app/admin/actions';
import FormMotivo from '@/app/admin/FormMotivo';
import BotaoAcao from '@/app/components/BotaoAcao';
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
  return texto ? `/admin/usuarios?${texto}` : '/admin/usuarios';
}

export default async function AdminUsuariosPage({ searchParams }: Props) {
  const admin = await exigirAdmin();
  const filtros = await searchParams;
  const busca = filtros.busca?.trim().slice(0, 60) ?? '';
  const paginaPedida = Number.parseInt(filtros.pagina ?? '1', 10);

  const where = busca
    ? {
        OR: [
          { name: { contains: busca, mode: 'insensitive' as const } },
          { email: { contains: busca, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const total = await prisma.user.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Number.isInteger(paginaPedida) ? Math.min(Math.max(paginaPedida, 1), totalPaginas) : 1;

  const usuarios = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
    include: { _count: { select: { teams: true, players: true } } },
  });

  return (
    <section className={ui.card}>
      <h2 className="text-lg font-bold mb-4">
        Usuários <span className="text-sm font-normal text-slate-500">({total})</span>
      </h2>

      <form method="GET" className="flex gap-2 mb-4">
        <input
          type="text"
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por nome ou e-mail..."
          className={`${ui.campo} flex-1 min-w-0`}
        />
        <button type="submit" className={ui.botaoPrimario}>Buscar</button>
      </form>

      {usuarios.length === 0 ? (
        <div className={ui.vazio}>
          <p className="text-slate-400 text-sm">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {usuarios.map((u) => {
            const usuarioAdmin = ehAdmin(u.email);
            const suspenso = !!u.bannedAt;
            const souEu = u.id === admin.id;

            return (
              <li key={u.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{u.name}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Desde {formatarData(u.createdAt)} · {u._count.teams} time(s) como dono ·{' '}
                      {u._count.players} no elenco
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {usuarioAdmin && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10">
                        Admin
                      </span>
                    )}
                    {suspenso && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-red-500/30 text-red-400 bg-red-500/10">
                        Suspenso
                      </span>
                    )}
                  </div>
                </div>

                {suspenso && u.banReason && (
                  <p className="text-xs text-slate-400 break-words">Motivo da suspensão: {u.banReason}</p>
                )}

                {!usuarioAdmin && !souEu && (
                  suspenso ? (
                    <BotaoAcao
                      action={reativarUsuario.bind(null, u.id)}
                      texto="Reativar conta"
                      textoPendente="Reativando..."
                      confirmacao={`Reativar a conta de ${u.name}?`}
                      className={ui.botaoSecundario}
                    />
                  ) : (
                    <FormMotivo
                      action={suspenderUsuario.bind(null, u.id)}
                      textoBotao="Suspender conta"
                      textoPendente="Suspendendo..."
                      confirmacao={`Suspender a conta de ${u.name}? Ela será desconectada agora.`}
                      placeholder="Motivo da suspensão (obrigatório)"
                    />
                  )
                )}
              </li>
            );
          })}
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
