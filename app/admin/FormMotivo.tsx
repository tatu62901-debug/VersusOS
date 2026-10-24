'use client';

import { useActionState } from 'react';
import { ui } from '@/lib/ui';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  action: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  textoBotao: string;
  textoPendente?: string;
  confirmacao?: string;
  placeholder?: string;
};

// Pequeno formulário de moderação: o admin escreve o MOTIVO (obrigatório) e confirma.
export default function FormMotivo({
  action,
  textoBotao,
  textoPendente = 'Aguarde...',
  confirmacao,
  placeholder = 'Motivo (obrigatório)',
}: Props) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(action, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmacao && !window.confirm(confirmacao)) e.preventDefault();
      }}
      className="w-full"
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          name="motivo"
          type="text"
          required
          minLength={5}
          maxLength={200}
          placeholder={placeholder}
          className={`${ui.campo} sm:flex-1 min-w-0`}
        />
        <button type="submit" disabled={pendente} className={ui.botaoPerigo}>
          {pendente ? textoPendente : textoBotao}
        </button>
      </div>
      {estado.erro && <p className="text-xs text-red-400 mt-1">{estado.erro}</p>}
      {estado.sucesso && <p className="text-xs text-emerald-400 mt-1">{estado.sucesso}</p>}
    </form>
  );
}
