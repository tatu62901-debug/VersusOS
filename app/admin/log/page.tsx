import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirAdmin } from '@/lib/permissoes';
import { descreverAcao } from '@/lib/admin';
import { formatarDataHora } from '@/lib/regras';
import { ui } from '@/lib/ui';

const POR_PAGINA = 25;

type Props = {
  searchParams: Promise<{ pagina?: string }>;
};

export default async function AdminLogPage({ searchParams }: Props) {
  await exigirAdmin();
  const filtros = await searchParams;
  const paginaPedida = Number.parseInt(filtros.pagina ?? '1', 10);

  const total = await prisma.adminLog.count();
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Number.isInteger(paginaPedida) ? Math.min(Math.max(paginaPedida, 1), totalPaginas) : 1;

  const logs = await prisma.adminLog.findMany({
    orderBy: { createdAt: 'desc' },
    skip: (pagina - 1) * POR_PAGINA,
    take: POR_PAGINA,
  });

  return (
    <section className={ui.card}>
      <h2 className="text-lg font-bold mb-4">
        Histórico de ações <span className="text-sm font-normal text-slate-500">({total})</span>
      </h2>

      {logs.length === 0 ? (
        <div className={ui.vazio}>
          <p className="text-slate-400 text-sm">Nenhuma ação de administrador registrada ainda.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl px-4 py-3">
              <p className="text-sm font-medium break-words">{descreverAcao(log.action, log.targetName)}</p>
              {log.reason && <p className="text-xs text-slate-400 mt-1 break-words">Motivo: {log.reason}</p>}
              <p className="text-[11px] text-slate-500 mt-1 break-words">
                {log.adminName} ({log.adminEmail}) · {formatarDataHora(log.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 && (
        <nav className="flex items-center justify-between gap-3 pt-4">
          {pagina > 1 ? (
            <Link href={pagina - 1 > 1 ? `/admin/log?pagina=${pagina - 1}` : '/admin/log'} className={ui.botaoSecundario}>
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-slate-400">Página {pagina} de {totalPaginas}</span>
          {pagina < totalPaginas ? (
            <Link href={`/admin/log?pagina=${pagina + 1}`} className={ui.botaoSecundario}>Próxima →</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
