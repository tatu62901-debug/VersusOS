import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirAdmin } from '@/lib/permissoes';
import { INSC_APROVADA, INSC_PENDENTE, formatarData, formatarPremio, statusCampeonato } from '@/lib/regras';
import { ui } from '@/lib/ui';

export default async function AdminCampeonatosPage() {
  await exigirAdmin();

  const campeonatos = await prisma.tournament.findMany({
    orderBy: { startDate: 'asc' },
    include: {
      registrations: { select: { status: true } },
    },
  });

  return (
    <section className={ui.card}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold">
          Campeonatos <span className="text-sm font-normal text-slate-500">({campeonatos.length})</span>
        </h2>
        <Link href="/admin/campeonatos/novo" className={ui.botaoPrimario}>+ Novo campeonato</Link>
      </div>

      {campeonatos.length === 0 ? (
        <div className={ui.vazio}>
          <p className="text-slate-400 text-sm">Nenhum campeonato cadastrado.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {campeonatos.map((c) => {
            const aprovados = c.registrations.filter((r) => r.status === INSC_APROVADA).length;
            const pendentes = c.registrations.filter((r) => r.status === INSC_PENDENTE).length;
            const status = statusCampeonato(c, aprovados);
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/60 rounded-xl p-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">
                    {c.game} · {formatarData(c.startDate)} · {formatarPremio(c.prize)} ·{' '}
                    {aprovados}/{c.maxTeams} times
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${status.classe}`}>
                      {status.rotulo}
                    </span>
                    {pendentes > 0 && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border text-amber-400 border-amber-500/30 bg-amber-500/10">
                        {pendentes} pendente(s)
                      </span>
                    )}
                  </div>
                </div>
                <Link href={`/admin/campeonatos/${c.id}`} className={ui.botaoSecundario}>
                  Gerenciar
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
