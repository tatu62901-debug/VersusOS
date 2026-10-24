import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirAdmin } from '@/lib/permissoes';
import { descreverAcao } from '@/lib/admin';
import { INSC_PENDENTE, PEDIDO_PENDENTE, formatarDataHora } from '@/lib/regras';
import { ui } from '@/lib/ui';

export default async function AdminResumoPage() {
  await exigirAdmin();

  const [usuarios, suspensos, times, jogadores, campeonatos, inscricoes, inscricoesPendentes, pedidos, logs] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { bannedAt: { not: null } } }),
      prisma.team.count(),
      prisma.player.count(),
      prisma.tournament.count(),
      prisma.registration.count(),
      prisma.registration.count({ where: { status: INSC_PENDENTE } }),
      prisma.joinRequest.count({ where: { status: PEDIDO_PENDENTE } }),
      prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    ]);

  const numeros = [
    { rotulo: 'Usuários', valor: usuarios, cor: 'text-indigo-400', href: '/admin/usuarios' },
    { rotulo: 'Suspensos', valor: suspensos, cor: 'text-red-400', href: '/admin/usuarios' },
    { rotulo: 'Times', valor: times, cor: 'text-emerald-400', href: '/admin/times' },
    { rotulo: 'Jogadores', valor: jogadores, cor: 'text-sky-400', href: '/admin/times' },
    { rotulo: 'Campeonatos', valor: campeonatos, cor: 'text-amber-400', href: '/admin/campeonatos' },
    { rotulo: 'Inscrições', valor: inscricoes, cor: 'text-fuchsia-400', href: '/admin/campeonatos' },
    { rotulo: 'Inscrições a aprovar', valor: inscricoesPendentes, cor: 'text-amber-300', href: '/admin/campeonatos' },
    { rotulo: 'Pedidos de entrada', valor: pedidos, cor: 'text-orange-400', href: '/admin/times' },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {numeros.map((n) => (
          <Link
            key={n.rotulo}
            href={n.href}
            className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-colors"
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500">{n.rotulo}</span>
            <p className={`text-3xl font-bold mt-1 ${n.cor}`}>{n.valor}</p>
          </Link>
        ))}
        <Link
          href="/admin/campeonatos/novo"
          className="bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 rounded-2xl p-4 flex items-center justify-center text-center text-sm font-medium text-indigo-300 transition-colors"
        >
          + Novo campeonato
        </Link>
      </section>

      <section className={ui.card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold">Últimas ações</h2>
          <Link href="/admin/log" className="text-sm text-indigo-400 hover:underline">Ver tudo</Link>
        </div>

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
                <p className="text-[11px] text-slate-500 mt-1">
                  {log.adminName} · {formatarDataHora(log.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
