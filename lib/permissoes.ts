import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';

// Garante que existe alguém logado. Se não houver, manda pro login.
export async function exigirUsuario() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

// Carrega um time e diz o que o usuário logado pode fazer nele.
// Retorna null se o time não existe OU se o usuário não tem relação com ele
// (assim a pessoa nem descobre que o time existe).
export async function carregarTime(timeId: string, userId: string) {
  const time = await prisma.team.findUnique({
    where: { id: timeId },
    include: {
      players: { orderBy: { createdAt: 'asc' } },
      registrations: {
        include: { tournament: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!time) return null;

  const ehDono = time.userId === userId;
  const meuJogador = time.players.find((j) => j.userId === userId) ?? null;

  if (!ehDono && !meuJogador) return null;

  return { time, ehDono, meuJogador };
}
