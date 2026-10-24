'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { criarTime, editarTime } from '@/app/times/actions';
import CampoImagem from '@/app/components/CampoImagem';
import { JOGOS, limitesDoJogo } from '@/lib/regras';
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
  const [jogoEscolhido, setJogoEscolhido] = useState(v?.game ?? time?.game ?? '');
  const limitesEscolhido = jogoEscolhido ? limitesDoJogo(jogoEscolhido) : null;

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
          onChange={(e) => setJogoEscolhido(e.target.value)}
          className={ui.campo}
        >
          <option value="" disabled>Escolha um jogo</option>
          {JOGOS.map((jogo) => (
            <option key={jogo} value={jogo}>{jogo}</option>
          ))}
        </select>
        {limitesEscolhido && (
          <p className="text-[11px] text-slate-500 mt-1">
            Formato: {limitesEscolhido.formato}. O time precisa de pelo menos {limitesEscolhido.min} jogador(es) para
            se inscrever e comporta no máximo {limitesEscolhido.max}.
          </p>
        )}
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
