'use client';

import { useActionState } from 'react';
import { registrarResultado } from '@/app/admin/actions';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  partidaId: string;
  placarA: number | null;
  placarB: number | null;
  corrigindo: boolean; // já tem resultado: o formulário serve para corrigir
};

// Formulário para o admin lançar (ou corrigir) o placar de uma partida
export default function FormResultado({ partidaId, placarA, placarB, corrigindo }: Props) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(
    registrarResultado.bind(null, partidaId),
    {}
  );

  return (
    <form action={formAction} className="pt-1">
      <div className="flex items-center gap-2">
        <input
          name="scoreA"
          type="number"
          min={0}
          max={99}
          required
          defaultValue={placarA ?? ''}
          aria-label="Placar do time de cima"
          className={`${ui.campo} !px-2 text-center w-16`}
        />
        <span className="text-slate-500">x</span>
        <input
          name="scoreB"
          type="number"
          min={0}
          max={99}
          required
          defaultValue={placarB ?? ''}
          aria-label="Placar do time de baixo"
          className={`${ui.campo} !px-2 text-center w-16`}
        />
        <button type="submit" disabled={pendente} className={`${corrigindo ? ui.botaoSecundario : ui.botaoPrimario} ml-auto`}>
          {pendente ? 'Salvando...' : corrigindo ? 'Corrigir' : 'Salvar'}
        </button>
      </div>
      {estado.erro && <p className="text-xs text-red-400 mt-1">{estado.erro}</p>}
      {estado.sucesso && <p className="text-xs text-emerald-400 mt-1">{estado.sucesso}</p>}
    </form>
  );
}
