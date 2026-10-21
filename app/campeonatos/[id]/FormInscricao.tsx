'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { inscreverTime } from '@/app/campeonatos/actions';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  campeonatoId: string;
  jogo: string;
  times: { id: string; name: string }[]; // meus times deste jogo que ainda não estão inscritos
  timeInicial?: string;
};

export default function FormInscricao({ campeonatoId, jogo, times, timeInicial }: Props) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(
    inscreverTime.bind(null, campeonatoId),
    {}
  );

  const inicial = times.some((t) => t.id === timeInicial) ? timeInicial : (times[0]?.id ?? '');

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}
      {estado.sucesso && <div className={ui.sucesso}>{estado.sucesso}</div>}

      {times.length > 0 ? (
        <>
          <div>
            <label htmlFor="timeId" className={ui.label}>Escolha o seu time</label>
            <select id="timeId" name="timeId" defaultValue={inicial} className={ui.campo}>
              {times.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={pendente} className={ui.botaoPrimario}>
            {pendente ? 'Inscrevendo...' : 'Inscrever time'}
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
