'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { solicitarEntrada } from '@/app/times/pedidos/actions';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  codigoInicial?: string;
};

export default function FormEntrar({ codigoInicial }: Props) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(solicitarEntrada, {});

  const v = estado.valores;

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}

      <div>
        <label htmlFor="codigo" className={ui.label}>Código do time</label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          required
          defaultValue={v?.codigo ?? codigoInicial ?? ''}
          placeholder="Ex: 9F3A1C7B"
          className={`${ui.campo} font-mono uppercase`}
        />
      </div>

      <p className="text-xs text-slate-500">Agora preencha como você vai aparecer no time:</p>

      <div>
        <label htmlFor="nickname" className={ui.label}>Seu nickname</label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          maxLength={20}
          defaultValue={v?.nickname ?? ''}
          placeholder="Ex: Shadow"
          className={ui.campo}
        />
      </div>

      <div>
        <label htmlFor="role" className={ui.label}>Sua função</label>
        <input
          id="role"
          name="role"
          type="text"
          required
          maxLength={30}
          defaultValue={v?.role ?? ''}
          placeholder="Ex: Suporte, Duelista"
          className={ui.campo}
        />
      </div>

      <div>
        <label htmlFor="age" className={ui.label}>Sua idade</label>
        <input
          id="age"
          name="age"
          type="number"
          required
          min={10}
          max={70}
          defaultValue={v?.age ?? ''}
          placeholder="Ex: 19"
          className={ui.campo}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={pendente} className={ui.botaoPrimario}>
          {pendente ? 'Enviando...' : 'Enviar pedido'}
        </button>
        <Link href="/times" className={ui.botaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
