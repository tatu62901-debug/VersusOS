import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import { PEDIDO_PENDENTE, PEDIDO_RECUSADO } from '@/lib/regras';
import { cancelarPedido } from '@/app/times/pedidos/actions';
import Header from '@/app/components/Header';
import Avatar from '@/app/components/Avatar';
import BotaoAcao from '@/app/components/BotaoAcao';
import { ui } from '@/lib/ui';

type CardTime = {
  id: string;
  name: string;
  game: string;
  logoUrl: string | null;
  _count: { players: number; registrations: number; joinRequests: number };
};

function ListaTimes({
  times,
  vazio,
  mostrarPedidos,
}: {
  times: CardTime[];
  vazio: string;
  mostrarPedidos?: boolean;
}) {
  if (times.length === 0) {
    return (
      <div className={ui.vazio}>
        <p className="text-slate-400 text-sm">{vazio}</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {times.map((time) => (
        <li key={time.id}>
          <Link
            href={`/times/${time.id}`}
            className="flex items-center gap-3 bg-slate-950/60 hover:border-indigo-500/50 border border-slate-800/60 rounded-xl p-4 transition-colors"
          >
            <Avatar src={time.logoUrl} nome={time.name} tamanho="sm" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{time.name}</p>
              <p className="text-xs text-slate-400 truncate">{time.game}</p>
              <p className="text-xs text-slate-500 mt-1">
                {time._count.players} {time._count.players === 1 ? 'jogador' : 'jogadores'} ·{' '}
                {time._count.registrations}{' '}
                {time._count.registrations === 1 ? 'inscrição' : 'inscrições'}
              </p>
              {mostrarPedidos && time._count.joinRequests > 0 && (
                <p className="text-xs text-amber-400 mt-1">
                  {time._count.joinRequests}{' '}
                  {time._count.joinRequests === 1 ? 'pedido de entrada' : 'pedidos de entrada'}
                </p>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function TimesPage() {
  const user = await exigirUsuario();

  const contagem = {
    select: {
      players: true,
      registrations: true,
      joinRequests: { where: { status: PEDIDO_PENDENTE } },
    },
  };

  const [meusTimes, timesOndeJogo, pedidosEnviados] = await Promise.all([
    prisma.team.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: contagem },
    }),
    prisma.team.findMany({
      where: { players: { some: { userId: user.id } }, NOT: { userId: user.id } },
      orderBy: { createdAt: 'desc' },
      include: { _count: contagem },
    }),
    prisma.joinRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { team: { select: { name: true, game: true } } },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Meus times</h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/times/entrar" className={ui.botaoSecundario}>Entrar com código</Link>
            <Link href="/times/novo" className={ui.botaoPrimario}>+ Criar time</Link>
          </div>
        </div>

        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">Times que eu criei</h2>
          <ListaTimes times={meusTimes} vazio="Você ainda não criou nenhum time." mostrarPedidos />
        </section>

        <section className={ui.card}>
          <h2 className="text-lg font-bold mb-4">Times em que eu jogo</h2>
          <ListaTimes
            times={timesOndeJogo}
            vazio="Você ainda não entrou em nenhum time. Peça o código ao dono de um time."
          />
        </section>

        {pedidosEnviados.length > 0 && (
          <section className={ui.card}>
            <h2 className="text-lg font-bold mb-4">Pedidos de entrada que eu enviei</h2>
            <ul className="space-y-3">
              {pedidosEnviados.map((pedido) => {
                const recusado = pedido.status === PEDIDO_RECUSADO;
                return (
                  <li
                    key={pedido.id}
                    className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800/60 rounded-xl p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{pedido.team.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {pedido.team.game} · como {pedido.nickname}
                      </p>
                      <span
                        className={`inline-block mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                          recusado
                            ? 'text-red-400 border-red-500/30 bg-red-500/10'
                            : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                        }`}
                      >
                        {recusado ? 'Recusado' : 'Aguardando aprovação'}
                      </span>
                    </div>
                    <BotaoAcao
                      action={cancelarPedido.bind(null, pedido.id)}
                      texto={recusado ? 'Remover da lista' : 'Cancelar pedido'}
                      className={ui.botaoSecundario}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
