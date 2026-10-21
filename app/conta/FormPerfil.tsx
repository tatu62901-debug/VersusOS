'use client';

import { useActionState } from 'react';
import { atualizarPerfil } from '@/app/conta/actions';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  nome: string;
  email: string;
};

export default function FormPerfil({ nome, email }: Props) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(atualizarPerfil, {});
  const v = estado.valores;

  return (
    <form action={formAction} className="space-y-4">
      {estado.erro && <div className={ui.erro}>{estado.erro}</div>}
      {estado.sucesso && <div className={ui.sucesso}>{estado.sucesso}</div>}

      <div>
        <label htmlFor="perfil-name" className={ui.label}>Nome</label>
        <input
          id="perfil-name"
          name="name"
          type="text"
          required
          maxLength={60}
          autoComplete="name"
          defaultValue={v?.name ?? nome}
          className={ui.campo}
        />
      </div>

      <div>
        <label htmlFor="perfil-email" className={ui.label}>E-mail</label>
        <input
          id="perfil-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={v?.email ?? email}
          className={ui.campo}
        />
      </div>

      <button type="submit" disabled={pendente} className={ui.botaoPrimario}>
        {pendente ? 'Salvando...' : 'Salvar perfil'}
      </button>
    </form>
  );
}
