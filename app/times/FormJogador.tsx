'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { adicionarJogador, editarJogador } from '@/app/times/actions';
import CampoImagem from '@/app/components/CampoImagem';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  timeId: string;
  jogador?: { id: string; nickname: string; role: string; age: number; avatarUrl: string | null };
  podeVincularEu?: boolean; // dono que ainda não está no elenco pode se adicionar como jogador
};

export default function FormJogador({ timeId, jogador, podeVincularEu }: Props) {
  const acao = jogador
    ? editarJogador.bind(null, timeId, jogador.id)
    : adicionarJogador.bind(null, timeId);
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(acao, {});

  const v = estado.valores;

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}

      <CampoImagem rotulo="Foto do jogador (opcional)" urlAtual={jogador?.avatarUrl} />

      <div>
        <label htmlFor="nickname" className={ui.label}>Nickname</label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          maxLength={20}
          defaultValue={v?.nickname ?? jogador?.nickname ?? ''}
          placeholder="Ex: Shadow"
          className={ui.campo}
        />
      </div>

      <div>
        <label htmlFor="role" className={ui.label}>Função</label>
        <input
          id="role"
          name="role"
          type="text"
          required
          maxLength={30}
          defaultValue={v?.role ?? jogador?.role ?? ''}
          placeholder="Ex: Capitão, Suporte, Duelista"
          className={ui.campo}
        />
      </div>

      <div>
        <label htmlFor="age" className={ui.label}>Idade</label>
        <input
          id="age"
          name="age"
          type="number"
          required
          min={10}
          max={70}
          defaultValue={v?.age ?? jogador?.age ?? ''}
          placeholder="Ex: 19"
          className={ui.campo}
        />
      </div>

      {podeVincularEu && !jogador && (
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" name="vincularEu" className="accent-indigo-500" />
          Este jogador sou eu (liga o jogador à minha conta)
        </label>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={pendente} className={ui.botaoPrimario}>
          {pendente ? 'Salvando...' : jogador ? 'Salvar alterações' : 'Adicionar jogador'}
        </button>
        <Link href={`/times/${timeId}`} className={ui.botaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
