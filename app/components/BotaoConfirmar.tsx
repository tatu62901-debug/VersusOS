'use client';

type Props = {
  action: () => Promise<void>;
  texto: string;
  confirmacao: string;
  className?: string;
};

// Botão que pergunta "tem certeza?" antes de executar uma Server Action
export default function BotaoConfirmar({ action, texto, confirmacao, className }: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmacao)) e.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {texto}
      </button>
    </form>
  );
}
