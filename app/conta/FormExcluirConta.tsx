'use client';

import { useActionState } from 'react';
import { excluirConta } from '@/app/conta/actions';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

export default function FormExcluirConta() {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(excluirConta, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm('Tem certeza? Excluir a conta é permanente e não dá pra desfazer.')) {
          e.preventDefault();
        }
      }}
      className="space-y-4"
    >
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}

      <div>
        <label htmlFor="senha-excluir" className={ui.label}>Digite a sua senha para confirmar</label>
        <input
          id="senha-excluir"
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className={ui.campo}
        />
      </div>

      <button type="submit" disabled={pendente} className={ui.botaoPerigo}>
        {pendente ? 'Excluindo...' : 'Excluir minha conta'}
      </button>
    </form>
  );
}
