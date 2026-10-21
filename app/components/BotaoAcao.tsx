'use client';

import { useActionState } from 'react';
import type { EstadoForm } from '@/lib/validacao';

type Props = {
  action: () => Promise<EstadoForm>;
  texto: string;
  textoPendente?: string;
  confirmacao?: string; // se informado, pergunta "tem certeza?" antes
  className?: string;
};

// Botão que executa uma Server Action e MOSTRA a mensagem de erro ou sucesso logo abaixo
export default function BotaoAcao({ action, texto, textoPendente, confirmacao, className }: Props) {
  const [estado, formAction, pendente] = useActionState<EstadoForm, FormData>(
    async () => action(),
    {}
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmacao && !window.confirm(confirmacao)) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pendente} className={className}>
        {pendente ? (textoPendente ?? 'Aguarde...') : texto}
      </button>
      {estado.erro && <p className="text-xs text-red-400 mt-1">{estado.erro}</p>}
      {estado.sucesso && <p className="text-xs text-emerald-400 mt-1">{estado.sucesso}</p>}
    </form>
  );
}
