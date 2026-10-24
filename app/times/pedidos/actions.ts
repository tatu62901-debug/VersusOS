'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import { PEDIDO_PENDENTE, PEDIDO_RECUSADO, limitesDoJogo } from '@/lib/regras';
import { type EstadoForm, texto, valoresDe, validarJogador } from '@/lib/validacao';

const CAMPOS_ENTRAR = ['codigo', 'nickname', 'role', 'age'];
const SEM_PERMISSAO = 'Você não tem permissão para fazer isso.';

/* =========================================================================
   PEDIDO DE ENTRADA NO TIME
   Quem tem o código envia um pedido; o DONO do time aprova ou recusa.
   ========================================================================= */

export async function solicitarEntrada(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const user = await exigirUsuario();
  const valores = valoresDe(formData, CAMPOS_ENTRAR);

  const codigo = texto(formData, 'codigo').toUpperCase();
  if (!codigo) return { erro: 'Informe o código do time.', valores };

  const v = validarJogador(formData);
  if (!v.ok) return { erro: v.erro, valores };

  const time = await prisma.team.findUnique({
    where: { inviteCode: codigo },
    include: { players: { select: { userId: true, nickname: true } } },
  });
  if (!time) return { erro: 'Código inválido. Confira com o dono do time.', valores };

  if (time.userId === user.id) {
    return {
      erro: 'Você é o dono deste time. Para entrar no elenco, use "Adicionar jogador" na página do time.',
      valores,
    };
  }
  if (time.players.some((j) => j.userId === user.id)) {
    return { erro: 'Você já faz parte deste time.', valores };
  }
  const maxJogadores = limitesDoJogo(time.game).max;
  if (time.players.length >= maxJogadores) {
    return { erro: `Este time já tem o máximo de ${maxJogadores} jogador(es) para ${time.game}.`, valores };
  }
  if (time.players.some((j) => j.nickname.toLowerCase() === v.dados.nickname.toLowerCase())) {
    return { erro: 'Já existe um jogador com esse nickname neste time. Escolha outro.', valores };
  }

  const pedidoExistente = await prisma.joinRequest.findUnique({
    where: { teamId_userId: { teamId: time.id, userId: user.id } },
  });
  if (pedidoExistente?.status === PEDIDO_PENDENTE) {
    return { erro: 'Você já enviou um pedido para este time. Aguarde a resposta do dono.', valores };
  }

  try {
    // Se o pedido anterior foi recusado, o novo pedido substitui o antigo
    await prisma.joinRequest.upsert({
      where: { teamId_userId: { teamId: time.id, userId: user.id } },
      update: { ...v.dados, status: PEDIDO_PENDENTE },
      create: { ...v.dados, status: PEDIDO_PENDENTE, teamId: time.id, userId: user.id },
    });
  } catch (error) {
    console.error('Erro ao enviar pedido de entrada:', error);
    return { erro: 'Não foi possível enviar o pedido. Tente novamente.', valores };
  }

  revalidatePath('/times');
  revalidatePath(`/times/${time.id}`);
  redirect('/times');
}

export async function aprovarPedido(timeId: string, pedidoId: string): Promise<EstadoForm> {
  const user = await exigirUsuario();

  const time = await prisma.team.findUnique({
    where: { id: timeId },
    include: { players: { select: { userId: true, nickname: true } } },
  });
  if (!time || time.userId !== user.id) return { erro: SEM_PERMISSAO };

  const pedido = await prisma.joinRequest.findFirst({
    where: { id: pedidoId, teamId: timeId, status: PEDIDO_PENDENTE },
  });
  if (!pedido) return { erro: 'Este pedido não existe mais.' };

  const maxJogadores = limitesDoJogo(time.game).max;
  if (time.players.length >= maxJogadores) {
    return { erro: `O time já tem o máximo de ${maxJogadores} jogador(es) para ${time.game}.` };
  }
  if (time.players.some((j) => j.userId === pedido.userId)) {
    // Já estava no elenco por algum outro caminho: só limpa o pedido
    await prisma.joinRequest.delete({ where: { id: pedido.id } });
    revalidatePath(`/times/${timeId}`);
    return { erro: 'Esta pessoa já faz parte do time.' };
  }
  if (time.players.some((j) => j.nickname.toLowerCase() === pedido.nickname.toLowerCase())) {
    return { erro: `Já existe um jogador com o nickname ${pedido.nickname}. Recuse o pedido e peça outro nickname.` };
  }

  try {
    await prisma.$transaction([
      prisma.player.create({
        data: {
          nickname: pedido.nickname,
          role: pedido.role,
          age: pedido.age,
          teamId: timeId,
          userId: pedido.userId,
        },
      }),
      prisma.joinRequest.delete({ where: { id: pedido.id } }),
    ]);
  } catch (error) {
    console.error('Erro ao aprovar pedido:', error);
    return { erro: 'Não foi possível aprovar o pedido. Tente novamente.' };
  }

  revalidatePath('/times');
  revalidatePath(`/times/${timeId}`);
  revalidatePath(`/equipes/${timeId}`);
  return { sucesso: 'Jogador aprovado!' };
}

export async function recusarPedido(timeId: string, pedidoId: string): Promise<EstadoForm> {
  const user = await exigirUsuario();

  const time = await prisma.team.findUnique({ where: { id: timeId } });
  if (!time || time.userId !== user.id) return { erro: SEM_PERMISSAO };

  const resultado = await prisma.joinRequest.updateMany({
    where: { id: pedidoId, teamId: timeId, status: PEDIDO_PENDENTE },
    data: { status: PEDIDO_RECUSADO },
  });
  if (resultado.count === 0) return { erro: 'Este pedido não existe mais.' };

  revalidatePath('/times');
  revalidatePath(`/times/${timeId}`);
  return { sucesso: 'Pedido recusado.' };
}

// Quem enviou o pedido pode cancelá-lo (ou limpar um pedido recusado da lista)
export async function cancelarPedido(pedidoId: string): Promise<EstadoForm> {
  const user = await exigirUsuario();

  const resultado = await prisma.joinRequest.deleteMany({
    where: { id: pedidoId, userId: user.id },
  });
  if (resultado.count === 0) return { erro: 'Este pedido não existe mais.' };

  revalidatePath('/times');
  return { sucesso: 'Pedido removido.' };
}
