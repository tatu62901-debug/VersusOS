import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import Header from '@/app/components/Header';
import FormTime from '@/app/times/FormTime';
import { ui } from '@/lib/ui';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarTimePage({ params }: Props) {
  const { id } = await params;
  const user = await exigirUsuario();

  const time = await prisma.team.findUnique({ where: { id } });
  // Só o dono pode editar; pra qualquer outra pessoa a página "não existe"
  if (!time || time.userId !== user.id) notFound();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Header user={user} />

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className={ui.card}>
          <h1 className="text-xl font-bold mb-6">Editar time</h1>
          <FormTime
            time={{
              id: time.id,
              name: time.name,
              game: time.game,
              description: time.description,
              logoUrl: time.logoUrl,
            }}
          />
        </div>
      </div>
    </main>
  );
}
