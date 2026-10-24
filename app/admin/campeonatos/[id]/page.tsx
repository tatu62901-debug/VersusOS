import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { exigirAdmin } from '@/lib/permissoes';
import {
  CAMP_ANDAMENTO,
  CAMP_ENCERRADO,
  CAMP_INSCRICOES,
  INSC_APROVADA,
  INSC_PENDENTE,
  dataParaInput,
  formatarData,
  limitesDoJogo,
  statusCampeonato,
} from '@/lib/regras';
import {
  aprovarInscricao,
  cancelarCampeonato,
  excluirCampeonato,
  iniciarCampeonato,
  recusarInscricao,
  removerInscricaoAdmin,
} from '@/app/admin/actions';
import FormCampeonato from '@/app/admin/FormCampeonato';
import FormMotivo from '@/app/admin/FormMotivo';
import FormResultado from '@/app/admin/FormResultado';
import BotaoAcao from '@/app/components/BotaoAcao';
import Avatar from '@/app/components/Avatar';
import Chaveamento from '@/app/components/Chaveamento';
import { ui } from '@/lib/ui';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminCampeonatoPage({ params }: Props) {
  await exigirAdmin();
  const { id } = await params;

  const campeonato = await prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { createdAt: 'asc' },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              game: true,
              logoUrl: true,
              user: { select: { name: true } },
              _count: { select: { players: true } },
            },
          },
        },
      },
      matches: { orderBy: [{ round: 'asc' }, { position: 'asc' }] },
    },
  });
  if (!campeonato) notFound();

  const aprovadas = campeonato.registrations.filter((r) => r.status === INSC_APROVADA);
  const pendentes = campeonato.registrations.filter((r) => r.status === INSC_PENDENTE);
  const status = statusCampeonato(campeonato, aprovadas.length);
  const emInscricoes = campeonato.status === CAMP_INSCRICOES;
  const emAndamento = campeonato.status === CAMP_ANDAMENTO;
  const encerrado = campeonato.status === CAMP_ENCERRADO;
  const minimo = limitesDoJogo(campeonato.game).min;
  const travado = !emInscricoes;
  const totalRodadas = campeonato.matches.length > 0 ? Math.max(...campeonato.matches.map((m) => m.round)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/campeonatos" className="text-sm text-slate-400 hover:text-white">
          ← Campeonatos
        </Link>
        <Link href={`/campeonatos/${campeonato.id}`} className="text-sm text-indigo-400 hover:underline">
          Ver página pública
        </Link>
      </div>

      {/* Situação e ações do campeonato */}
      <section className={ui.card}>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h2 className="text-lg font-bold break-words">{campeonato.name}</h2>
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${status.classe}`}>
            {status.rotulo}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {campeonato.game} · início {formatarData(campeonato.startDate)} · inscrições até{' '}
          {formatarData(campeonato.registrationDeadline)} · {aprovadas.length}/{campeonato.maxTeams} times aprovados
        </p>

        {encerrado && campeonato.championName && (
          <p className="text-sm text-amber-400 mt-3">
            🏆 Campeão: <strong>{campeonato.championName}</strong> · 🥈 Vice: <strong>{campeonato.runnerUpName}</strong>
          </p>
        )}

        {emInscricoes && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-400">
              Quando as inscrições terminarem, inicie o campeonato: o sistema sorteia o chaveamento com os times
              aprovados (mínimo de 2). Inscrições pendentes são descartadas.
            </p>
            <BotaoAcao
              action={iniciarCampeonato.bind(null, campeonato.id)}
              texto="Iniciar campeonato (sortear chaveamento)"
              textoPendente="Sorteando..."
              confirmacao={`Iniciar o campeonato com ${aprovadas.length} time(s) aprovado(s)? As ${pendentes.length} inscrição(ões) pendente(s) serão descartadas e não dá pra voltar atrás.`}
              className={ui.botaoPrimario}
            />
          </div>
        )}

        {(emInscricoes || emAndamento) && (
          <div className="mt-5 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2">Cancelar o campeonato (o motivo fica no histórico):</p>
            <FormMotivo
              action={cancelarCampeonato.bind(null, campeonato.id)}
              textoBotao="Cancelar campeonato"
              textoPendente="Cancelando..."
              confirmacao={`Cancelar o campeonato ${campeonato.name}?`}
              placeholder="Motivo do cancelamento (obrigatório)"
            />
          </div>
        )}
      </section>

      {/* Chaveamento e resultados */}
      {campeonato.matches.length > 0 && (
        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-1">Chaveamento e resultados</h2>
          <p className="text-xs text-slate-400 mb-4">
            Lance o placar de cada partida (sem empates). O vencedor avança sozinho e a final define campeão e vice.
            {totalRodadas > 0 && ' Dá pra corrigir um resultado enquanto a partida seguinte não foi jogada.'}
          </p>
          <Chaveamento
            partidas={campeonato.matches}
            renderAcao={(p) =>
              p.teamAName && p.teamBName && (emAndamento || encerrado) ? (
                <FormResultado
                  partidaId={p.id}
                  placarA={p.scoreA}
                  placarB={p.scoreB}
                  corrigindo={!!p.winnerSide}
                />
              ) : null
            }
          />
        </section>
      )}

      {/* Inscrições pendentes */}
      {emInscricoes && (
        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">
            Inscrições pendentes{' '}
            <span className="text-sm font-normal text-amber-400">({pendentes.length})</span>
          </h2>

          {pendentes.length === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Nenhuma inscrição aguardando aprovação.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {pendentes.map((inscricao) => {
                const incompleto = inscricao.team._count.players < minimo;
                return (
                  <li key={inscricao.id} className="bg-slate-950/60 border border-amber-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={inscricao.team.logoUrl} nome={inscricao.team.name} tamanho="sm" />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/times/${inscricao.team.id}`}
                          className="font-semibold truncate block hover:text-indigo-400"
                        >
                          {inscricao.team.name}
                        </Link>
                        <p className="text-xs text-slate-400 truncate">
                          Dono: {inscricao.team.user.name} · {inscricao.team._count.players} jogador(es)
                          {incompleto && ` (faltam jogadores: mínimo ${minimo})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
                      <BotaoAcao
                        action={aprovarInscricao.bind(null, campeonato.id, inscricao.team.id)}
                        texto="Aprovar"
                        textoPendente="Aprovando..."
                        className={ui.botaoPrimario}
                      />
                      <div className="flex-1">
                        <FormMotivo
                          action={recusarInscricao.bind(null, campeonato.id, inscricao.team.id)}
                          textoBotao="Recusar"
                          textoPendente="Recusando..."
                          placeholder="Motivo da recusa (obrigatório)"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Times aprovados */}
      <section className={ui.card}>
        <h2 className="text-lg font-bold mb-4">
          Times aprovados{' '}
          <span className="text-sm font-normal text-slate-500">
            ({aprovadas.length}/{campeonato.maxTeams})
          </span>
        </h2>

        {aprovadas.length === 0 ? (
          <div className={ui.vazio}>
            <p className="text-slate-400 text-sm">Nenhum time aprovado.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {aprovadas.map((inscricao) => (
              <li key={inscricao.id} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={inscricao.team.logoUrl} nome={inscricao.team.name} tamanho="sm" />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/times/${inscricao.team.id}`}
                      className="font-semibold truncate block hover:text-indigo-400"
                    >
                      {inscricao.team.name}
                    </Link>
                    <p className="text-xs text-slate-400 truncate">
                      Dono: {inscricao.team.user.name} · {inscricao.team._count.players} jogador(es) · inscrito em{' '}
                      {formatarData(inscricao.createdAt)}
                    </p>
                  </div>
                </div>
                {emInscricoes && (
                  <FormMotivo
                    action={removerInscricaoAdmin.bind(null, campeonato.id, inscricao.team.id)}
                    textoBotao="Remover do campeonato"
                    textoPendente="Removendo..."
                    confirmacao={`Remover o time ${inscricao.team.name} deste campeonato?`}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Editar dados */}
      <section className={`${ui.card} max-w-2xl`}>
        <h2 className="text-lg font-bold mb-1">Editar dados</h2>
        <p className="text-xs text-slate-400 mb-6">Nome, descrição, premiação, datas, vagas e imagem.</p>
        <FormCampeonato
          campeonato={{
            id: campeonato.id,
            name: campeonato.name,
            game: campeonato.game,
            description: campeonato.description,
            prize: campeonato.prize,
            maxTeams: campeonato.maxTeams,
            startDate: dataParaInput(campeonato.startDate),
            registrationDeadline: dataParaInput(campeonato.registrationDeadline),
            imageUrl: campeonato.imageUrl,
            travado,
          }}
        />
      </section>

      <section className="bg-slate-900 border border-red-500/30 rounded-2xl p-5 md:p-6">
        <h2 className="text-lg font-bold text-red-400 mb-1">Excluir campeonato</h2>
        <p className="text-xs text-slate-400 mb-4">
          Apaga o campeonato, as inscrições e o chaveamento. Isso não pode ser desfeito.
        </p>
        <BotaoAcao
          action={excluirCampeonato.bind(null, campeonato.id)}
          texto="Excluir campeonato"
          textoPendente="Excluindo..."
          confirmacao={`Excluir o campeonato ${campeonato.name}? As inscrições e o chaveamento também serão apagados.`}
          className={ui.botaoPerigo}
        />
      </section>
    </div>
  );
}
