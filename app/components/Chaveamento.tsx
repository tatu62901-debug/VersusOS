import type { ReactNode } from 'react';
import { nomeDaRodada } from '@/lib/chaveamento';

export type PartidaView = {
  id: string;
  round: number;
  position: number;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerSide: string | null;
};

type Props = {
  partidas: PartidaView[];
  // Opcional: o admin usa isso para colocar o formulário de resultado em cada partida
  renderAcao?: (partida: PartidaView) => ReactNode;
};

function LinhaDoTime({
  nome,
  placar,
  vencedor,
  decidida,
}: {
  nome: string | null;
  placar: number | null;
  vencedor: boolean;
  decidida: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${
        vencedor ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-900 border border-slate-800'
      }`}
    >
      <span
        className={`truncate text-sm ${
          !nome ? 'italic text-slate-500' : vencedor ? 'font-bold text-emerald-300' : decidida ? 'text-slate-400' : 'text-slate-100'
        }`}
      >
        {nome ?? 'A definir'}
      </span>
      <span className={`shrink-0 font-mono text-sm ${vencedor ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
        {placar ?? '-'}
      </span>
    </div>
  );
}

// Chaveamento de mata-mata, rodada por rodada (sem rolagem lateral, funciona no celular).
// Sem disputa de 3º lugar: a Final define o campeão e o vice.
export default function Chaveamento({ partidas, renderAcao }: Props) {
  if (partidas.length === 0) return null;

  const totalRodadas = Math.max(...partidas.map((p) => p.round));
  const rodadas = Array.from({ length: totalRodadas }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {rodadas.map((round) => {
        const daRodada = partidas
          .filter((p) => p.round === round)
          .sort((a, b) => a.position - b.position);
        const ehFinal = round === totalRodadas;

        return (
          <div key={round}>
            <h3 className={`text-sm font-bold mb-3 ${ehFinal ? 'text-amber-400' : 'text-slate-300'}`}>
              {nomeDaRodada(round, totalRodadas)}
            </h3>
            <div className={`grid gap-3 ${ehFinal ? 'grid-cols-1 max-w-md' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {daRodada.map((p) => {
                const decidida = !!p.winnerSide;
                const folga = p.round === 1 && decidida && (!p.teamAName || !p.teamBName);

                return (
                  <div
                    key={p.id}
                    className={`rounded-xl p-3 space-y-2 bg-slate-950/60 border ${
                      ehFinal ? 'border-amber-500/30' : 'border-slate-800/60'
                    }`}
                  >
                    {folga ? (
                      <>
                        <LinhaDoTime nome={p.teamAName ?? p.teamBName} placar={null} vencedor decidida />
                        <p className="text-[11px] text-slate-500">Folga: avança direto para a próxima rodada.</p>
                      </>
                    ) : (
                      <>
                        <LinhaDoTime nome={p.teamAName} placar={p.scoreA} vencedor={p.winnerSide === 'A'} decidida={decidida} />
                        <LinhaDoTime nome={p.teamBName} placar={p.scoreB} vencedor={p.winnerSide === 'B'} decidida={decidida} />
                      </>
                    )}
                    {renderAcao && !folga && renderAcao(p)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
