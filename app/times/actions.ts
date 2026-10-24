'use server';

import { randomBytes } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import { limitesDoJogo } from '@/lib/regras';
import { apagarImagem, enviarImagem, lerImagem } from '@/lib/imagem';
import {
  type EstadoForm,
  valoresDe,
  validarTime,
  validarJogador,
} from '@/lib/validacao';

const CAMPOS_TIME = ['name', 'game', 'description'];
const CAMPOS_JOGADOR = ['nickname', 'role', 'age'];
const SEM_PERMISSAO = 'Você não tem permissão para fazer isso.';
const ERRO_UPLOAD = 'Não foi possível enviar a imagem. Tente novamente.';

function gerarCodigo() {
  return randomBytes(4).toString('hex').toUpperCase(); // ex: 9F3A1C7B
}

/* =========================================================================
   TIMES
   Regra de permissão: só o DONO (Team.userId) edita ou exclui o time.
   Toda checagem é feita aqui no servidor, não depende de esconder botão.
   ========================================================================= */

export async function criarTime(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const user = await exigirUsuario();
  const valores = valoresDe(formData, CAMPOS_TIME);

  const v = validarTime(formData);
  if (!v.ok) return { erro: v.erro, valores };

  const leitura = await lerImagem(formData);
  if (!leitura.ok) return { erro: leitura.erro, valores };

  const nomeEmUso = await prisma.team.findUnique({ where: { name: v.dados.name } });
  if (nomeEmUso) return { erro: 'Já existe um time com esse nome. Escolha outro.', valores };

  let logoUrl: string | null = null;
  if (leitura.imagem) {
    try {
      logoUrl = await enviarImagem(leitura.imagem, 'times');
    } catch (error) {
      console.error('Erro no upload da logo:', error);
      return { erro: ERRO_UPLOAD, valores };
    }
  }

  let timeId: string;
  try {
    const time = await prisma.team.create({
      data: { ...v.dados, logoUrl, userId: user.id, inviteCode: gerarCodigo() },
    });
    timeId = time.id;
  } catch (error) {
    console.error('Erro ao criar time:', error);
    await apagarImagem(logoUrl);
    return { erro: 'Não foi possível criar o time. Tente novamente.', valores };
  }

  revalidatePath('/times');
  redirect(`/times/${timeId}`);
}

export async function editarTime(
  timeId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const user = await exigirUsuario();
  const valores = valoresDe(formData, CAMPOS_TIME);

  const time = await prisma.team.findUnique({ where: { id: timeId } });
  if (!time || time.userId !== user.id) return { erro: SEM_PERMISSAO, valores };

  const v = validarTime(formData);
  if (!v.ok) return { erro: v.erro, valores };

  const leitura = await lerImagem(formData);
  if (!leitura.ok) return { erro: leitura.erro, valores };

  const nomeEmUso = await prisma.team.findFirst({
    where: { name: v.dados.name, NOT: { id: timeId } },
  });
  if (nomeEmUso) return { erro: 'Já existe um time com esse nome. Escolha outro.', valores };

  if (v.dados.game !== time.game) {
    const jogadores = await prisma.player.count({ where: { teamId: timeId } });
    const novoMax = limitesDoJogo(v.dados.game).max;
    if (jogadores > novoMax) {
      return {
        erro: `${v.dados.game} comporta no máximo ${novoMax} jogador(es) no elenco, e o time tem ${jogadores}. Remova jogadores antes de trocar o jogo.`,
        valores,
      };
    }
    const inscricoes = await prisma.registration.count({ where: { teamId: timeId } });
    if (inscricoes > 0) {
      return {
        erro: 'Não dá pra trocar o jogo de um time inscrito em campeonatos. Cancele as inscrições antes.',
        valores,
      };
    }
  }

  let novaUrl: string | null = null;
  if (leitura.imagem) {
    try {
      novaUrl = await enviarImagem(leitura.imagem, 'times');
    } catch (error) {
      console.error('Erro no upload da logo:', error);
      return { erro: ERRO_UPLOAD, valores };
    }
  }

  // nova imagem > remover a atual > manter a atual
  const logoUrl = novaUrl ?? (leitura.remover ? null : time.logoUrl);

  try {
    await prisma.team.update({ where: { id: timeId }, data: { ...v.dados, logoUrl } });
  } catch (error) {
    console.error('Erro ao editar time:', error);
    await apagarImagem(novaUrl);
    return { erro: 'Não foi possível salvar as alterações. Tente novamente.', valores };
  }

  if (logoUrl !== time.logoUrl) await apagarImagem(time.logoUrl);

  revalidatePath('/times');
  revalidatePath(`/times/${timeId}`);
  revalidatePath(`/equipes/${timeId}`);
  redirect(`/times/${timeId}`);
}

export async function excluirTime(timeId: string): Promise<void> {
  const user = await exigirUsuario();

  const time = await prisma.team.findUnique({
    where: { id: timeId },
    include: { players: { select: { avatarUrl: true } } },
  });
  if (!time || time.userId !== user.id) throw new Error(SEM_PERMISSAO);

  // Jogadores, pedidos e inscrições do time são apagados junto (onDelete: Cascade)
  await prisma.team.delete({ where: { id: timeId } });

  // Limpa as imagens do Blob (logo do time e fotos dos jogadores)
  await Promise.all([
    apagarImagem(time.logoUrl),
    ...time.players.map((j) => apagarImagem(j.avatarUrl)),
  ]);

  revalidatePath('/times');
  revalidatePath('/painel');
  redirect('/times');
}

/* =========================================================================
   CÓDIGO DE CONVITE E LIDERANÇA (só o dono)
   ========================================================================= */

export async function regenerarCodigo(timeId: string): Promise<EstadoForm> {
  const user = await exigirUsuario();

  const time = await prisma.team.findUnique({ where: { id: timeId } });
  if (!time || time.userId !== user.id) return { erro: SEM_PERMISSAO };

  try {
    await prisma.team.update({ where: { id: timeId }, data: { inviteCode: gerarCodigo() } });
  } catch (error) {
    console.error('Erro ao gerar novo código:', error);
    return { erro: 'Não foi possível gerar um novo código. Tente novamente.' };
  }

  revalidatePath(`/times/${timeId}`);
  return { sucesso: 'Novo código gerado. O código antigo não funciona mais.' };
}

export async function transferirLideranca(timeId: string, jogadorId: string): Promise<EstadoForm> {
  const user = await exigirUsuario();

  const time = await prisma.team.findUnique({ where: { id: timeId } });
  if (!time || time.userId !== user.id) return { erro: SEM_PERMISSAO };

  const jogador = await prisma.player.findFirst({ where: { id: jogadorId, teamId: timeId } });
  if (!jogador) return { erro: 'Jogador não encontrado neste time.' };
  if (!jogador.userId) {
    return { erro: 'Só dá pra passar a liderança para um jogador que tem conta no site.' };
  }
  if (jogador.userId === user.id) return { erro: 'Você já é o dono deste time.' };

  try {
    await prisma.team.update({ where: { id: timeId }, data: { userId: jogador.userId } });
  } catch (error) {
    console.error('Erro ao transferir liderança:', error);
    return { erro: 'Não foi possível transferir a liderança. Tente novamente.' };
  }

  revalidatePath('/times');
  revalidatePath(`/times/${timeId}`);
  revalidatePath('/painel');

  // Se o antigo dono não está no elenco, ele perde o acesso à página de gerenciamento
  const aindaNoElenco = await prisma.player.findFirst({
    where: { teamId: timeId, userId: user.id },
  });
  redirect(aindaNoElenco ? `/times/${timeId}` : '/times');
}

/* =========================================================================
   JOGADORES
   - Dono do time: adiciona, edita e remove QUALQUER jogador do time.
   - Jogador que entrou pelo código: edita e remove (sai) só o PRÓPRIO registro.
   ========================================================================= */

export async function adicionarJogador(
  timeId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const user = await exigirUsuario();
  const valores = valoresDe(formData, CAMPOS_JOGADOR);

  const time = await prisma.team.findUnique({
    where: { id: timeId },
    include: { players: { select: { nickname: true, userId: true } } },
  });
  if (!time || time.userId !== user.id) return { erro: SEM_PERMISSAO, valores };

  const v = validarJogador(formData);
  if (!v.ok) return { erro: v.erro, valores };

  const leitura = await lerImagem(formData);
  if (!leitura.ok) return { erro: leitura.erro, valores };

  const maxJogadores = limitesDoJogo(time.game).max;
  if (time.players.length >= maxJogadores) {
    return { erro: `O elenco de ${time.game} comporta no máximo ${maxJogadores} jogador(es).`, valores };
  }
  if (time.players.some((j) => j.nickname.toLowerCase() === v.dados.nickname.toLowerCase())) {
    return { erro: 'Já existe um jogador com esse nickname neste time.', valores };
  }

  // "Este jogador sou eu": liga o jogador à conta do dono (só se ele ainda não estiver no elenco)
  let vincularUserId: string | null = null;
  if (formData.get('vincularEu') === 'on') {
    if (time.players.some((j) => j.userId === user.id)) {
      return { erro: 'Você já está no elenco deste time.', valores };
    }
    vincularUserId = user.id;
  }

  let avatarUrl: string | null = null;
  if (leitura.imagem) {
    try {
      avatarUrl = await enviarImagem(leitura.imagem, 'jogadores');
    } catch (error) {
      console.error('Erro no upload da foto:', error);
      return { erro: ERRO_UPLOAD, valores };
    }
  }

  try {
    await prisma.player.create({
      data: { ...v.dados, avatarUrl, teamId: timeId, userId: vincularUserId },
    });
  } catch (error) {
    console.error('Erro ao adicionar jogador:', error);
    await apagarImagem(avatarUrl);
    return { erro: 'Não foi possível adicionar o jogador. Tente novamente.', valores };
  }

  revalidatePath('/times');
  revalidatePath(`/times/${timeId}`);
  revalidatePath(`/equipes/${timeId}`);
  redirect(`/times/${timeId}`);
}

export async function editarJogador(
  timeId: string,
  jogadorId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const user = await exigirUsuario();
  const valores = valoresDe(formData, CAMPOS_JOGADOR);

  const jogador = await prisma.player.findFirst({
    where: { id: jogadorId, teamId: timeId },
    include: { team: { select: { userId: true } } },
  });
  const podeEditar = jogador && (jogador.team.userId === user.id || jogador.userId === user.id);
  if (!jogador || !podeEditar) return { erro: SEM_PERMISSAO, valores };

  const v = validarJogador(formData);
  if (!v.ok) return { erro: v.erro, valores };

  const leitura = await lerImagem(formData);
  if (!leitura.ok) return { erro: leitura.erro, valores };

  const nickEmUso = await prisma.player.findFirst({
    where: {
      teamId: timeId,
      nickname: { equals: v.dados.nickname, mode: 'insensitive' },
      NOT: { id: jogadorId },
    },
  });
  if (nickEmUso) return { erro: 'Já existe um jogador com esse nickname neste time.', valores };

  let novaUrl: string | null = null;
  if (leitura.imagem) {
    try {
      novaUrl = await enviarImagem(leitura.imagem, 'jogadores');
    } catch (error) {
      console.error('Erro no upload da foto:', error);
      return { erro: ERRO_UPLOAD, valores };
    }
  }

  const avatarUrl = novaUrl ?? (leitura.remover ? null : jogador.avatarUrl);

  try {
    await prisma.player.update({ where: { id: jogadorId }, data: { ...v.dados, avatarUrl } });
  } catch (error) {
    console.error('Erro ao editar jogador:', error);
    await apagarImagem(novaUrl);
    return { erro: 'Não foi possível salvar as alterações. Tente novamente.', valores };
  }

  if (avatarUrl !== jogador.avatarUrl) await apagarImagem(jogador.avatarUrl);

  revalidatePath(`/times/${timeId}`);
  revalidatePath(`/equipes/${timeId}`);
  redirect(`/times/${timeId}`);
}

export async function removerJogador(timeId: string, jogadorId: string): Promise<void> {
  const user = await exigirUsuario();

  const jogador = await prisma.player.findFirst({
    where: { id: jogadorId, teamId: timeId },
    include: { team: { select: { userId: true } } },
  });
  if (!jogador) redirect('/times');

  const ehDono = jogador.team.userId === user.id;
  const ehEuMesmo = jogador.userId === user.id;
  if (!ehDono && !ehEuMesmo) throw new Error(SEM_PERMISSAO);

  await prisma.player.delete({ where: { id: jogadorId } });
  await apagarImagem(jogador.avatarUrl);

  revalidatePath('/times');
  revalidatePath(`/times/${timeId}`);
  revalidatePath(`/equipes/${timeId}`);

  // Quem saiu do time (e não é o dono) perde o acesso à página dele
  if (!ehDono) redirect('/times');
}
