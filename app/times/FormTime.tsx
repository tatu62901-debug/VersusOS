'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { criarTime, editarTime } from '@/app/times/actions';
import CampoImagem from '@/app/components/CampoImagem';
import { JOGOS } from '@/lib/regras';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  time?: {
    id: string;
    name: string;
    game: string;
    description: string | null;
    logoUrl: string | null;
  };
};

export default function FormTime({ time }: Props) {
  const acao = time ? editarTime.bind(null, time.id) : criarTime;
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(acao, {});

  const v = estado.valores;

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}

      <CampoImagem rotulo="Logo do time (opcional)" urlAtual={time?.logoUrl} />

      <div>
        <label htmlFor="name" className={ui.label}>Nome do time</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={30}
          defaultValue={v?.name ?? time?.name ?? ''}
          placeholder="Ex: Os Imortais"
          className={ui.campo}
        />
      </div>

      <div>
        <label htmlFor="game" className={ui.label}>Jogo</label>
        <select
          id="game"
          name="game"
          required
          defaultValue={v?.game ?? time?.game ?? ''}
          className={ui.campo}
        >
          <option value="" disabled>Escolha um jogo</option>
          {JOGOS.map((jogo) => (
            <option key={jogo} value={jogo}>{jogo}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className={ui.label}>Descrição (opcional)</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={200}
          defaultValue={v?.description ?? time?.description ?? ''}
          placeholder="Fale um pouco sobre o time"
          className={ui.campo}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={pendente} className={ui.botaoPrimario}>
          {pendente ? 'Salvando...' : time ? 'Salvar alterações' : 'Criar time'}
        </button>
        <Link href={time ? `/times/${time.id}` : '/times'} className={ui.botaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
