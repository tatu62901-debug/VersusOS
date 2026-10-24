import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { exigirAdmin } from '@/lib/permissoes';
import { formatarData } from '@/lib/regras';
import { excluirTimeAdmin, removerInscricaoAdmin, removerJogadorAdmin } from '@/app/admin/actions';
import FormMotivo from '@/app/admin/FormMotivo';
import Avatar from '@/app/components/Avatar';
import { ui } from '@/lib/ui';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminTimePage({ params }: Props) {
  await exigirAdmin();
  const { id } = await params;

  const time = await prisma.team.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      players: { orderBy: { createdAt: 'asc' } },
      registrations: {
        orderBy: { createdAt: 'desc' },
        include: { tournament: { select: { id: true, name: true, startDate: true, status: true } } },
      },
    },
  });
  if (!time) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/times" className="text-sm text-slate-400 hover:text-white">← Times</Link>
        <Link href={`/equipes/${time.id}`} className="text-sm text-indigo-400 hover:underline">
          Ver página pública
        </Link>
      </div>

      <section className={ui.card}>
        <div className="flex items-start gap-4 min-w-0">
          <Avatar src={time.logoUrl} nome={time.name} tamanho="lg" />
          <div className="min-w-0">
            <h2 className="text-2xl font-bold break-words">{time.name}</h2>
            <p className="text-sm text-indigo-400">{time.game}</p>
            <p className="text-xs text-slate-400 mt-2 break-words">
              Dono: {time.user.name} ({time.user.email})
            </p>
            {time.description && <p className="text-sm text-slate-300 mt-2 break-words">{time.description}</p>}
          </div>
        </div>
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-bold mb-4">
          Jogadores <span className="text-sm font-normal text-slate-500">({time.players.length})</span>
        </h2>
        {time.players.length === 0 ? (
          <div className={ui.vazio}>
            <p className="text-slate-400 text-sm">Este time não tem jogadores.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {time.players.map((jogador) => (
              <li key={jogador.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={jogador.avatarUrl} nome={jogador.nickname} tamanho="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{jogador.nickname}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {jogador.role} · {jogador.age} anos · {jogador.userId ? 'com conta' : 'sem conta'}
                    </p>
                  </div>
                </div>
                <FormMotivo
                  action={removerJogadorAdmin.bind(null, time.id, jogador.id)}
                  textoBotao="Remover do time"
                  textoPendente="Removendo..."
                  confirmacao={`Remover ${jogador.nickname} do time ${time.name}?`}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-bold mb-4">
          Campeonatos <span className="text-sm font-normal text-slate-500">({time.registrations.length})</span>
        </h2>
        {time.registrations.length === 0 ? (
          <div className={ui.vazio}>
            <p className="text-slate-400 text-sm">Este time não está inscrito em campeonatos.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {time.registrations.map((inscricao) => (
              <li key={inscricao.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/campeonatos/${inscricao.tournament.id}`}
                    className="font-semibold truncate block hover:text-indigo-400"
                  >
                    {inscricao.tournament.name}
                  </Link>
                  <p className="text-xs text-slate-400">Início: {formatarData(inscricao.tournament.startDate)}</p>
                </div>
                <p className="text-xs text-slate-500">
                  Inscrição: {inscricao.status === 'APROVADA' ? 'aprovada' : 'aguardando aprovação'} · campeonato:{' '}
                  {inscricao.tournament.status === 'INSCRICOES' ? 'em fase de inscrições' : inscricao.tournament.status === 'EM_ANDAMENTO' ? 'em andamento' : inscricao.tournament.status === 'ENCERRADO' ? 'encerrado' : 'cancelado'}
                </p>
                {inscricao.tournament.status === 'INSCRICOES' && (
                  <FormMotivo
                    action={removerInscricaoAdmin.bind(null, inscricao.tournament.id, time.id)}
                    textoBotao="Remover do campeonato"
                    textoPendente="Removendo..."
                    confirmacao={`Remover o time ${time.name} do campeonato ${inscricao.tournament.name}?`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-slate-900 border border-red-500/30 rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-red-400 mb-1">Excluir time</h2>
        <p className="text-xs text-slate-400 mb-4">
          Apaga o time, os jogadores e as inscrições dele. Isso não pode ser desfeito.
        </p>
        <FormMotivo
          action={excluirTimeAdmin.bind(null, time.id)}
          textoBotao="Excluir time"
          textoPendente="Excluindo..."
          confirmacao={`Excluir o time ${time.name} definitivamente?`}
        />
      </section>
    </div>
  );
}
