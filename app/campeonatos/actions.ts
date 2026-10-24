'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import {
  CAMP_INSCRICOES,
  INSC_APROVADA,
  INSC_PENDENTE,
  limitesDoJogo,
  statusCampeonato,
} from '@/lib/regras';
import { type EstadoForm, texto } from '@/lib/validacao';

// Só o DONO do time pode inscrevê-lo (ou cancelar a inscrição) em um campeonato.
// A inscrição nasce PENDENTE e só vale depois que a administração aprova.
export async function inscreverTime(
  campeonatoId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const user = await exigirUsuario();

  const timeId = texto(formData, 'timeId');
  if (!timeId) return { erro: 'Escolha o time que será inscrito.' };

  const [time, campeonato] = await Promise.all([
    prisma.team.findUnique({
      where: { id: timeId },
      include: { _count: { select: { players: true } } },
    }),
    prisma.tournament.findUnique({
      where: { id: campeonatoId },
      include: {
        _count: { select: { registrations: { where: { status: INSC_APROVADA } } } },
      },
    }),
  ]);

  if (!campeonato) return { erro: 'Campeonato não encontrado.' };
  if (!time || time.userId !== user.id) {
    return { erro: 'Só o dono do time pode inscrevê-lo em um campeonato.' };
  }

  const status = statusCampeonato(campeonato, campeonato._count.registrations);
  if (!status.aberto) {
    const mensagens: Record<string, string> = {
      PRAZO: 'O prazo de inscrição deste campeonato já terminou.',
      LOTADO: 'Este campeonato não tem mais vagas.',
      ANDAMENTO: 'Este campeonato já começou.',
      ENCERRADO: 'Este campeonato já terminou.',
      CANCELADO: 'Este campeonato foi cancelado.',
    };
    return { erro: mensagens[status.chave] ?? 'As inscrições não estão abertas.' };
  }

  if (time.game !== campeonato.game) {
    return { erro: `Este campeonato é de ${campeonato.game}, mas o time joga ${time.game}.` };
  }

  const limites = limitesDoJogo(time.game);
  if (time._count.players < limites.min) {
    return {
      erro: `Para jogar ${time.game} (${limites.formato}), o time precisa ter pelo menos ${limites.min} jogador(es). Hoje ele tem ${time._count.players}.`,
    };
  }

  const jaInscrito = await prisma.registration.findUnique({
    where: { teamId_tournamentId: { teamId: timeId, tournamentId: campeonatoId } },
  });
  if (jaInscrito) {
    return {
      erro:
        jaInscrito.status === INSC_PENDENTE
          ? 'A inscrição deste time já foi enviada e está aguardando aprovação.'
          : 'Este time já está inscrito neste campeonato.',
    };
  }

  try {
    await prisma.registration.create({
      data: { teamId: timeId, tournamentId: campeonatoId, status: INSC_PENDENTE },
    });
  } catch (error) {
    console.error('Erro ao inscrever time:', error);
    return { erro: 'Não foi possível concluir a inscrição. Tente novamente.' };
  }

  revalidatePath(`/campeonatos/${campeonatoId}`);
  revalidatePath(`/times/${timeId}`);
  revalidatePath('/painel');
  revalidatePath('/admin', 'layout');

  return {
    sucesso: `Inscrição do time ${time.name} enviada! Ela vale depois que a administração aprovar.`,
  };
}

export async function cancelarInscricao(campeonatoId: string, timeId: string): Promise<void> {
  const user = await exigirUsuario();

  const inscricao = await prisma.registration.findUnique({
    where: { teamId_tournamentId: { teamId: timeId, tournamentId: campeonatoId } },
    include: { team: { select: { userId: true } }, tournament: true },
  });
  if (!inscricao) return;

  if (inscricao.team.userId !== user.id) {
    throw new Error('Você não tem permissão para fazer isso.');
  }
  if (inscricao.tournament.status !== CAMP_INSCRICOES) {
    throw new Error('Este campeonato já começou, não dá mais pra cancelar a inscrição.');
  }

  await prisma.registration.delete({ where: { id: inscricao.id } });

  revalidatePath(`/campeonatos/${campeonatoId}`);
  revalidatePath(`/times/${timeId}`);
  revalidatePath('/painel');
  revalidatePath('/admin', 'layout');
  revalidatePath('/');
}
