'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { inscreverTime } from '@/app/campeonatos/actions';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  campeonatoId: string;
  jogo: string;
  // meus times deste jogo que ainda não estão inscritos
  times: { id: string; name: string; jogadores: number; minimo: number }[];
  timeInicial?: string;
};

export default function FormInscricao({ campeonatoId, jogo, times, timeInicial }: Props) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(
    inscreverTime.bind(null, campeonatoId),
    {}
  );

  const habilitados = times.filter((t) => t.jogadores >= t.minimo);
  const sugerido = habilitados.find((t) => t.id === timeInicial)?.id ?? habilitados[0]?.id ?? '';

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}
      {estado.sucesso && <div className={ui.sucesso}>{estado.sucesso}</div>}

      {times.length > 0 ? (
        <>
          <div>
            <label htmlFor="timeId" className={ui.label}>Escolha o seu time</label>
            <select id="timeId" name="timeId" defaultValue={sugerido} className={ui.campo}>
              {times.map((t) => {
                const incompleto = t.jogadores < t.minimo;
                return (
                  <option key={t.id} value={t.id} disabled={incompleto}>
                    {t.name}
                    {incompleto ? ` (faltam jogadores: ${t.jogadores}/${t.minimo})` : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              A inscrição fica aguardando a aprovação da administração.
            </p>
          </div>

          <button type="submit" disabled={pendente || habilitados.length === 0} className={ui.botaoPrimario}>
            {pendente ? 'Enviando...' : 'Inscrever time'}
          </button>
        </>
      ) : (
        !estado.sucesso && (
          <div className={ui.vazio}>
            <p className="text-slate-400 text-sm">
              Você não tem nenhum time de {jogo} disponível para este campeonato.
            </p>
            <Link href="/times/novo" className="inline-block mt-3 text-sm text-indigo-400 hover:underline">
              Criar um time
            </Link>
          </div>
        )
      )}
    </form>
  );
}
