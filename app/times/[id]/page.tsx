import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { carregarTime, exigirUsuario } from '@/lib/permissoes';
import {
  MAX_JOGADORES,
  PEDIDO_PENDENTE,
  formatarData,
  formatarPremio,
  statusCampeonato,
} from '@/lib/regras';
import { excluirTime, regenerarCodigo, removerJogador, transferirLideranca } from '@/app/times/actions';
import { aprovarPedido, recusarPedido } from '@/app/times/pedidos/actions';
import { cancelarInscricao } from '@/app/campeonatos/actions';
import Header from '@/app/components/Header';
import Avatar from '@/app/components/Avatar';
import BotaoAcao from '@/app/components/BotaoAcao';
import BotaoConfirmar from '@/app/components/BotaoConfirmar';
import { ui } from '@/lib/ui';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TimePage({ params }: Props) {
  const { id } = await params;
  const user = await exigirUsuario();

  // Só dono e jogadores do time enxergam esta página
  const contexto = await carregarTime(id, user.id);
  if (!contexto) notFound();

  const { time, ehDono, meuJogador } = contexto;
  const lotado = time.players.length >= MAX_JOGADORES;

  // Só o dono vê os pedidos de entrada e os campeonatos abertos para inscrever
  const [pedidos, abertos] = ehDono
    ? await Promise.all([
        prisma.joinRequest.findMany({
          where: { teamId: time.id, status: PEDIDO_PENDENTE },
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        }),
        prisma.tournament
          .findMany({
            where: {
              game: time.game,
              startDate: { gt: new Date() },
              registrations: { none: { teamId: time.id } },
            },
            orderBy: { startDate: 'asc' },
            include: { _count: { select: { registrations: true } } },
          })
          .then((lista) => lista.filter((c) => statusCampeonato(c, c._count.registrations).aberto)),
      ])
    : [[], []];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href="/times" className="text-sm text-slate-400 hover:text-white">← Meus times</Link>

        {/* Dados do time */}
        <section className={ui.card}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <Avatar src={time.logoUrl} nome={time.name} tamanho="lg" />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold break-words">{time.name}</h1>
                <p className="text-sm text-indigo-400 mt-1">{time.game}</p>
                <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-slate-700 text-slate-300">
                  {ehDono ? 'Você é o dono' : 'Você é jogador'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href={`/equipes/${time.id}`} className={ui.botaoSecundario}>
                Página pública
              </Link>
              {ehDono && (
                <>
                  <Link href={`/times/${time.id}/editar`} className={ui.botaoSecundario}>
                    Editar time
                  </Link>
                  <BotaoConfirmar
                    action={excluirTime.bind(null, time.id)}
                    texto="Excluir time"
                    confirmacao={`Excluir o time ${time.name}? Os jogadores e as inscrições dele também serão apagados.`}
                    className={ui.botaoPerigo}
                  />
                </>
              )}
              {!ehDono && meuJogador && (
                <BotaoConfirmar
                  action={removerJogador.bind(null, time.id, meuJogador.id)}
                  texto="Sair do time"
                  confirmacao={`Sair do time ${time.name}?`}
                  className={ui.botaoPerigo}
                />
              )}
            </div>
          </div>

          {time.description && (
            <p className="text-sm text-slate-300 mt-4 break-words">{time.description}</p>
          )}
        </section>

        {/* Código de convite (só o dono vê) */}
        {ehDono && (
          <section className={ui.card}>
            <h2 className="text-lg font-bold mb-1">Código de convite</h2>
            <p className="text-xs text-slate-400 mb-3">
              Passe este código para quem quer entrar no time (em Meus times, Entrar com código).
              Cada pessoa envia um pedido, e você aprova ou recusa aqui embaixo.
            </p>
            <div className="flex flex-wrap items-start gap-3">
              <p className="inline-block font-mono text-xl tracking-widest text-emerald-400 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2">
                {time.inviteCode}
              </p>
              <BotaoAcao
                action={regenerarCodigo.bind(null, time.id)}
                texto="Gerar novo código"
                textoPendente="Gerando..."
                confirmacao="Gerar um novo código? O código atual deixa de funcionar."
                className={ui.botaoSecundario}
              />
            </div>
          </section>
        )}

        {/* Pedidos de entrada (só o dono vê) */}
        {ehDono && pedidos.length > 0 && (
          <section className={ui.card}>
            <h2 className="text-lg font-bold mb-4">
              Pedidos de entrada{' '}
              <span className="text-sm font-normal text-amber-400">({pedidos.length})</span>
            </h2>
            <ul className="space-y-3">
              {pedidos.map((pedido) => (
                <li
                  key={pedido.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-amber-500/20 rounded-xl p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{pedido.nickname}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {pedido.role} · {pedido.age} anos · conta de {pedido.user.name}
                    </p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <BotaoAcao
                      action={aprovarPedido.bind(null, time.id, pedido.id)}
                      texto="Aprovar"
                      textoPendente="Aprovando..."
                      className={ui.botaoPrimario}
                    />
                    <BotaoAcao
                      action={recusarPedido.bind(null, time.id, pedido.id)}
                      texto="Recusar"
                      textoPendente="Recusando..."
                      className={ui.botaoPerigo}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Jogadores */}
        <section className={ui.card}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold">
              Jogadores{' '}
              <span className="text-sm font-normal text-slate-500">
                ({time.players.length}/{MAX_JOGADORES})
              </span>
            </h2>
            {ehDono && !lotado && (
              <Link href={`/times/${time.id}/jogadores/novo`} className={ui.botaoPrimario}>
                + Adicionar jogador
              </Link>
            )}
          </div>

          {time.players.length === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Este time ainda não tem jogadores.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {time.players.map((jogador) => {
                const souEu = jogador.userId === user.id;
                const podeMexer = ehDono || souEu;
                const podePassarLideranca = ehDono && jogador.userId && !souEu;

                return (
                  <li
                    key={jogador.id}
                    className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/60 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={jogador.avatarUrl} nome={jogador.nickname} tamanho="sm" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {jogador.nickname}
                          {souEu && (
                            <span className="ml-2 text-[10px] uppercase tracking-wider text-indigo-400 border border-indigo-500/30 rounded px-1.5 py-0.5">
                              Você
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {jogador.role} · {jogador.age} anos
                        </p>
                      </div>
                    </div>

                    {podeMexer && (
                      <div className="flex flex-wrap gap-2 items-start">
                        <Link
                          href={`/times/${time.id}/jogadores/${jogador.id}/editar`}
                          className={ui.botaoSecundario}
                        >
                          Editar
                        </Link>
                        {podePassarLideranca && (
                          <BotaoAcao
                            action={transferirLideranca.bind(null, time.id, jogador.id)}
                            texto="Passar liderança"
                            textoPendente="Transferindo..."
                            confirmacao={`Passar a liderança do time para ${jogador.nickname}? Você deixa de ser o dono${
                              time.players.some((j) => j.userId === user.id)
                                ? ', mas continua no elenco'
                                : ' e perde o acesso ao gerenciamento do time'
                            }.`}
                            className={ui.botaoSecundario}
                          />
                        )}
                        {/* Dono remove qualquer um; jogador só pode remover a si mesmo */}
                        {!(souEu && !ehDono) && (
                          <BotaoConfirmar
                            action={removerJogador.bind(null, time.id, jogador.id)}
                            texto="Remover"
                            confirmacao={`Remover ${jogador.nickname} do time?`}
                            className={ui.botaoPerigo}
                          />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Campeonatos */}
        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">Campeonatos</h2>

          {time.registrations.length === 0 ? (
            <div className={ui.vazio}>
              <p className="text-slate-400 text-sm">Este time ainda não está inscrito em nenhum campeonato.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {time.registrations.map((inscricao) => {
                const c = inscricao.tournament;
                const iniciado = c.startDate.getTime() <= Date.now();

                return (
                  <li
                    key={inscricao.id}
                    className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/60 rounded-xl p-4"
                  >
                    <div className="min-w-0">
                      <Link href={`/campeonatos/${c.id}`} className="font-semibold truncate block hover:text-indigo-400">
                        {c.name}
                      </Link>
                      <p className="text-xs text-slate-400">
                        Início: {formatarData(c.startDate)} · Prêmio: {formatarPremio(c.prize)}
                      </p>
                    </div>
                    {ehDono && !iniciado && (
                      <BotaoConfirmar
                        action={cancelarInscricao.bind(null, c.id, time.id)}
                        texto="Cancelar inscrição"
                        confirmacao={`Cancelar a inscrição do time em ${c.name}?`}
                        className={ui.botaoPerigo}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {ehDono && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">
                Campeonatos abertos de {time.game}
              </h3>
              {abertos.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhum campeonato aberto disponível no momento.</p>
              ) : (
                <ul className="space-y-2">
                  {abertos.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-slate-800/60 rounded-xl p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-slate-500">
                          {formatarData(c.startDate)} · {c._count.registrations}/{c.maxTeams} times
                        </p>
                      </div>
                      <Link
                        href={`/campeonatos/${c.id}?time=${time.id}`}
                        className={ui.botaoPrimario}
                      >
                        Inscrever
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
