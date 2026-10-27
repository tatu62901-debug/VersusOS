'use client';

import { useActionState } from 'react';
import { trocarSenha } from '@/app/conta/actions';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

export default function FormSenha() {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(trocarSenha, {});

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}
      {estado.sucesso && <div className={ui.sucesso}>{estado.sucesso}</div>}

      <div>
        <label htmlFor="senhaAtual" className={ui.label}>Senha atual</label>
        <input
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          required
          autoComplete="current-password"
          className={ui.campo}
        />
      </div>

      <div>
        <label htmlFor="senhaNova" className={ui.label}>Nova senha</label>
        <input
          id="senhaNova"
          name="senhaNova"
          type="password"
          required
          maxLength={72}
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          className={ui.campo}
        />
      </div>

      <div>
        <label htmlFor="confirmacao" className={ui.label}>Confirmar nova senha</label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          autoComplete="new-password"
          className={ui.campo}
        />
      </div>

      <button type="submit" disabled={pendente} className={ui.botaoPrimario}>
        {pendente ? 'Alterando...' : 'Alterar senha'}
      </button>
    </form>
  );
}
