import { exigirUsuario } from '@/lib/permissoes';
import Header from '@/app/components/Header';
import FormEntrar from '@/app/times/FormEntrar';
import { ui } from '@/lib/ui';

type Props = {
  searchParams: Promise<{ codigo?: string }>;
};

export default async function EntrarNoTimePage({ searchParams }: Props) {
  const user = await exigirUsuario();
  const { codigo } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className={ui.card}>
          <h1 className="text-xl font-bold mb-1">Entrar em um time</h1>
          <p className="text-xs text-slate-400 mb-6">
            Peça o código de convite ao dono do time e preencha seus dados de jogador.
            Seu pedido será enviado ao dono, que precisa aprová-lo.
          </p>
          <FormEntrar codigoInicial={codigo} />
        </div>
      </div>
    </main>
  );
}
