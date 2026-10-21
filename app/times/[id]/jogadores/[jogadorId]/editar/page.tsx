import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import Header from '@/app/components/Header';
import FormJogador from '@/app/times/FormJogador';
import { ui } from '@/lib/ui';

type Props = {
  params: Promise<{ id: string; jogadorId: string }>;
};

export default async function EditarJogadorPage({ params }: Props) {
  const { id, jogadorId } = await params;
  const user = await exigirUsuario();

  const jogador = await prisma.player.findFirst({
    where: { id: jogadorId, teamId: id },
    include: { team: { select: { name: true, userId: true } } },
  });

  // Pode editar: o dono do time ou o próprio jogador. Para os outros, a página "não existe".
  const permitido = jogador && (jogador.team.userId === user.id || jogador.userId === user.id);
  if (!jogador || !permitido) notFound();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className={ui.card}>
          <h1 className="text-xl font-bold mb-1">Editar jogador</h1>
          <p className="text-xs text-slate-400 mb-6">Time: {jogador.team.name}</p>
          <FormJogador
            timeId={id}
            jogador={{
              id: jogador.id,
              nickname: jogador.nickname,
              role: jogador.role,
              age: jogador.age,
              avatarUrl: jogador.avatarUrl,
            }}
          />
        </div>
      </div>
    </main>
  );
}
