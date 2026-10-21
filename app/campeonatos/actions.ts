'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import { MIN_JOGADORES_INSCRICAO, statusCampeonato } from '@/lib/regras';
import { type EstadoForm, texto } from '@/lib/validacao';

// Só o DONO do time pode inscrevê-lo (ou cancelar a inscrição) em um campeonato.
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
      include: { _count: { select: { registrations: true } } },
    }),
  ]);

  if (!campeonato) return { erro: 'Campeonato não encontrado.' };
  if (!time || time.userId !== user.id) {
    return { erro: 'Só o dono do time pode inscrevê-lo em um campeonato.' };
  }

  const status = statusCampeonato(campeonato, campeonato._count.registrations);
  if (!status.aberto) {
    return {
      erro:
        status.rotulo === 'Encerrado'
          ? 'As inscrições deste campeonato já foram encerradas.'
          : 'Este campeonato não tem mais vagas.',
    };
  }

  if (time.game !== campeonato.game) {
    return { erro: `Este campeonato é de ${campeonato.game}, mas o time joga ${time.game}.` };
  }

  if (time._count.players < MIN_JOGADORES_INSCRICAO) {
    return {
      erro: `O time precisa ter pelo menos ${MIN_JOGADORES_INSCRICAO} jogadores para se inscrever.`,
    };
  }

  const jaInscrito = await prisma.registration.findUnique({
    where: { teamId_tournamentId: { teamId: timeId, tournamentId: campeonatoId } },
  });
  if (jaInscrito) return { erro: 'Este time já está inscrito neste campeonato.' };

  try {
    await prisma.registration.create({
      data: { teamId: timeId, tournamentId: campeonatoId },
    });
  } catch (error) {
    console.error('Erro ao inscrever time:', error);
    return { erro: 'Não foi possível concluir a inscrição. Tente novamente.' };
  }

  revalidatePath(`/campeonatos/${campeonatoId}`);
  revalidatePath(`/times/${timeId}`);
  revalidatePath('/painel');
  revalidatePath('/');

  return { sucesso: `O time ${time.name} foi inscrito com sucesso!` };
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
  if (inscricao.tournament.startDate.getTime() <= Date.now()) {
    throw new Error('Este campeonato já começou, não dá mais pra cancelar a inscrição.');
  }

  await prisma.registration.delete({ where: { id: inscricao.id } });

  revalidatePath(`/campeonatos/${campeonatoId}`);
  revalidatePath(`/times/${timeId}`);
  revalidatePath('/painel');
  revalidatePath('/');
}
