'use server';

import { randomInt } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import { ACOES_ADMIN, ehAdmin, registrarLog } from '@/lib/admin';
import { apagarImagem, enviarImagem, lerImagem } from '@/lib/imagem';
import {
  CAMP_ANDAMENTO,
  CAMP_CANCELADO,
  CAMP_ENCERRADO,
  CAMP_INSCRICOES,
  INSC_APROVADA,
  INSC_PENDENTE,
  dataParaInput,
  limitesDoJogo,
} from '@/lib/regras';
import {
  type Partida,
  aplicarResultado,
  embaralhar,
  gerarChaveamento,
} from '@/lib/chaveamento';
import {
  type EstadoForm,
  texto,
  valoresDe,
  validarCampeonato,
  validarMotivo,
} from '@/lib/validacao';

const CAMPOS_CAMPEONATO = ['name', 'game', 'description', 'prize', 'maxTeams', 'startDate', 'registrationDeadline'];
const SEM_PERMISSAO = 'Você não tem permissão para fazer isso.';
const ERRO_UPLOAD = 'Não foi possível enviar a imagem. Tente novamente.';

// TODA ação deste arquivo começa conferindo, no servidor, se quem chamou é admin.
async function adminLogado() {
  const user = await exigirUsuario();
  return ehAdmin(user.email) ? user : null;
}

function revalidarCampeonato(campeonatoId: string) {
  revalidatePath('/');
  revalidatePath(`/campeonatos/${campeonatoId}`);
  revalidatePath('/admin', 'layout');
}

/* =========================================================================
   CAMPEONATOS (CRUD)
   ========================================================================= */

export async function criarCampeonato(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };
  const valores = valoresDe(formData, CAMPOS_CAMPEONATO);

  const v = validarCampeonato(formData);
  if (!v.ok) return { erro: v.erro, valores };
  if (v.dados.startDate.getTime() <= Date.now()) {
    return { erro: 'A data de início precisa ser no futuro.', valores };
  }
  if (v.dados.registrationDeadline.getTime() <= Date.now()) {
    return { erro: 'O prazo de inscrição precisa ser no futuro.', valores };
  }

  const leitura = await lerImagem(formData);
  if (!leitura.ok) return { erro: leitura.erro, valores };

  const nomeEmUso = await prisma.tournament.findUnique({ where: { name: v.dados.name } });
  if (nomeEmUso) return { erro: 'Já existe um campeonato com esse nome.', valores };

  let imageUrl: string | null = null;
  if (leitura.imagem) {
    try {
      imageUrl = await enviarImagem(leitura.imagem, 'campeonatos');
    } catch (error) {
      console.error('Erro no upload da imagem do campeonato:', error);
      return { erro: ERRO_UPLOAD, valores };
    }
  }

  let campeonatoId: string;
  try {
    const c = await prisma.tournament.create({
      data: {
        name: v.dados.name,
        game: v.dados.game,
        description: v.dados.description,
        prize: v.dados.prize,
        maxTeams: v.dados.maxTeams,
        startDate: v.dados.startDate,
        registrationDeadline: v.dados.registrationDeadline,
        imageUrl,
      },
    });
    campeonatoId = c.id;
  } catch (error) {
    console.error('Erro ao criar campeonato:', error);
    await apagarImagem(imageUrl);
    return { erro: 'Não foi possível criar o campeonato. Tente novamente.', valores };
  }

  await registrarLog(admin, { acao: ACOES_ADMIN.CAMPEONATO_CRIADO, alvo: v.dados.name });

  revalidatePath('/');
  revalidatePath('/admin', 'layout');
  redirect(`/admin/campeonatos/${campeonatoId}`);
}

export async function editarCampeonato(
  campeonatoId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };
  const valores = valoresDe(formData, CAMPOS_CAMPEONATO);

  const atual = await prisma.tournament.findUnique({
    where: { id: campeonatoId },
    include: { registrations: { select: { status: true } } },
  });
  if (!atual) return { erro: 'Campeonato não encontrado.', valores };

  const v = validarCampeonato(formData);
  if (!v.ok) return { erro: v.erro, valores };

  const aprovados = atual.registrations.filter((r) => r.status === INSC_APROVADA).length;
  const dataMudou = v.dados.dataTexto !== dataParaInput(atual.startDate);
  const prazoMudou = v.dados.prazoTexto !== dataParaInput(atual.registrationDeadline);

  // Depois que o campeonato começa (ou termina/é cancelado), as regras e datas ficam travadas
  if (atual.status !== CAMP_INSCRICOES) {
    if (v.dados.game !== atual.game || v.dados.maxTeams !== atual.maxTeams || dataMudou || prazoMudou) {
      return {
        erro: 'Este campeonato já foi iniciado, encerrado ou cancelado: só dá pra editar nome, descrição, premiação e imagem.',
        valores,
      };
    }
  }

  if (dataMudou && v.dados.startDate.getTime() <= Date.now()) {
    return { erro: 'A nova data de início precisa ser no futuro.', valores };
  }
  if (prazoMudou && v.dados.registrationDeadline.getTime() <= Date.now()) {
    return { erro: 'O novo prazo de inscrição precisa ser no futuro.', valores };
  }
  if (v.dados.game !== atual.game && atual.registrations.length > 0) {
    return {
      erro: 'Não dá pra trocar o jogo de um campeonato que já tem times inscritos. Remova as inscrições antes.',
      valores,
    };
  }
  if (v.dados.maxTeams < aprovados) {
    return {
      erro: `O campeonato já tem ${aprovados} time(s) aprovado(s), então o limite não pode ser menor que isso.`,
      valores,
    };
  }

  const leitura = await lerImagem(formData);
  if (!leitura.ok) return { erro: leitura.erro, valores };

  const nomeEmUso = await prisma.tournament.findFirst({
    where: { name: v.dados.name, NOT: { id: campeonatoId } },
  });
  if (nomeEmUso) return { erro: 'Já existe um campeonato com esse nome.', valores };

  let novaUrl: string | null = null;
  if (leitura.imagem) {
    try {
      novaUrl = await enviarImagem(leitura.imagem, 'campeonatos');
    } catch (error) {
      console.error('Erro no upload da imagem do campeonato:', error);
      return { erro: ERRO_UPLOAD, valores };
    }
  }

  const imageUrl = novaUrl ?? (leitura.remover ? null : atual.imageUrl);

  try {
    await prisma.tournament.update({
      where: { id: campeonatoId },
      data: {
        name: v.dados.name,
        game: v.dados.game,
        description: v.dados.description,
        prize: v.dados.prize,
        maxTeams: v.dados.maxTeams,
        startDate: dataMudou ? v.dados.startDate : atual.startDate,
        registrationDeadline: prazoMudou ? v.dados.registrationDeadline : atual.registrationDeadline,
        imageUrl,
      },
    });
  } catch (error) {
    console.error('Erro ao editar campeonato:', error);
    await apagarImagem(novaUrl);
    return { erro: 'Não foi possível salvar as alterações. Tente novamente.', valores };
  }

  if (imageUrl !== atual.imageUrl) await apagarImagem(atual.imageUrl);
  await registrarLog(admin, { acao: ACOES_ADMIN.CAMPEONATO_EDITADO, alvo: v.dados.name });

  revalidarCampeonato(campeonatoId);
  return { sucesso: 'Campeonato atualizado com sucesso!', valores };
}

export async function excluirCampeonato(campeonatoId: string): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const campeonato = await prisma.tournament.findUnique({
    where: { id: campeonatoId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!campeonato) return { erro: 'Campeonato não encontrado.' };

  try {
    // Inscrições e partidas do campeonato são apagadas junto (onDelete: Cascade)
    await prisma.tournament.delete({ where: { id: campeonatoId } });
  } catch (error) {
    console.error('Erro ao excluir campeonato:', error);
    return { erro: 'Não foi possível excluir o campeonato. Tente novamente.' };
  }

  await apagarImagem(campeonato.imageUrl);
  const n = campeonato._count.registrations;
  await registrarLog(admin, {
    acao: ACOES_ADMIN.CAMPEONATO_EXCLUIDO,
    alvo: campeonato.name,
    motivo: n > 0 ? `${n} inscrição(ões) removida(s) junto` : null,
  });

  revalidatePath('/');
  revalidatePath('/painel');
  revalidatePath('/admin', 'layout');
  redirect('/admin/campeonatos');
}

/* =========================================================================
   INSCRIÇÕES: aprovar, recusar e remover
   ========================================================================= */

export async function aprovarInscricao(campeonatoId: string, timeId: string): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const inscricao = await prisma.registration.findUnique({
    where: { teamId_tournamentId: { teamId: timeId, tournamentId: campeonatoId } },
    include: {
      tournament: true,
      team: { select: { name: true, game: true, _count: { select: { players: true } } } },
    },
  });
  if (!inscricao) return { erro: 'Esta inscrição não existe mais.' };
  if (inscricao.status === INSC_APROVADA) return { erro: 'Esta inscrição já foi aprovada.' };
  if (inscricao.tournament.status !== CAMP_INSCRICOES) {
    return { erro: 'Este campeonato não está mais na fase de inscrições.' };
  }

  const limites = limitesDoJogo(inscricao.team.game);
  if (inscricao.team._count.players < limites.min) {
    return { erro: `O time tem menos de ${limites.min} jogador(es) agora. Recuse a inscrição ou espere ele completar o elenco.` };
  }

  const aprovados = await prisma.registration.count({
    where: { tournamentId: campeonatoId, status: INSC_APROVADA },
  });
  if (aprovados >= inscricao.tournament.maxTeams) {
    return { erro: 'O campeonato já está com todas as vagas preenchidas.' };
  }

  await prisma.registration.update({ where: { id: inscricao.id }, data: { status: INSC_APROVADA } });
  await registrarLog(admin, {
    acao: ACOES_ADMIN.INSCRICAO_APROVADA,
    alvo: `${inscricao.tournament.name} (time ${inscricao.team.name})`,
    timeId,
  });

  revalidarCampeonato(campeonatoId);
  revalidatePath(`/times/${timeId}`);
  return { sucesso: 'Inscrição aprovada!' };
}

export async function recusarInscricao(
  campeonatoId: string,
  timeId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const m = validarMotivo(formData);
  if (!m.ok) return { erro: m.erro };

  const inscricao = await prisma.registration.findUnique({
    where: { teamId_tournamentId: { teamId: timeId, tournamentId: campeonatoId } },
    include: { tournament: { select: { name: true, status: true } }, team: { select: { name: true } } },
  });
  if (!inscricao) return { erro: 'Esta inscrição não existe mais.' };
  if (inscricao.status !== INSC_PENDENTE) {
    return { erro: 'Só dá pra recusar inscrições pendentes. Para tirar um time já aprovado, use "Remover do campeonato".' };
  }

  await prisma.registration.delete({ where: { id: inscricao.id } });
  await registrarLog(admin, {
    acao: ACOES_ADMIN.INSCRICAO_RECUSADA,
    alvo: `${inscricao.tournament.name} (time ${inscricao.team.name})`,
    motivo: m.dados.motivo,
    timeId,
  });

  revalidarCampeonato(campeonatoId);
  revalidatePath(`/times/${timeId}`);
  return { sucesso: 'Inscrição recusada.' };
}

export async function removerInscricaoAdmin(
  campeonatoId: string,
  timeId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const m = validarMotivo(formData);
  if (!m.ok) return { erro: m.erro };

  const inscricao = await prisma.registration.findUnique({
    where: { teamId_tournamentId: { teamId: timeId, tournamentId: campeonatoId } },
    include: { tournament: { select: { name: true, status: true } }, team: { select: { name: true } } },
  });
  if (!inscricao) return { erro: 'Esta inscrição não existe mais.' };
  if (inscricao.tournament.status !== CAMP_INSCRICOES) {
    return { erro: 'O chaveamento já foi sorteado: não dá mais pra tirar times. Se precisar, cancele o campeonato.' };
  }

  await prisma.registration.delete({ where: { id: inscricao.id } });
  await registrarLog(admin, {
    acao: ACOES_ADMIN.INSCRICAO_REMOVIDA,
    alvo: `${inscricao.tournament.name} (time ${inscricao.team.name})`,
    motivo: m.dados.motivo,
    timeId,
  });

  revalidarCampeonato(campeonatoId);
  revalidatePath(`/times/${timeId}`);
  return { sucesso: 'Time removido do campeonato.' };
}

/* =========================================================================
   INICIAR, CANCELAR E REGISTRAR RESULTADOS
   ========================================================================= */

export async function iniciarCampeonato(campeonatoId: string): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const campeonato = await prisma.tournament.findUnique({
    where: { id: campeonatoId },
    include: {
      registrations: {
        orderBy: { createdAt: 'asc' },
        include: { team: { select: { id: true, name: true } } },
      },
    },
  });
  if (!campeonato) return { erro: 'Campeonato não encontrado.' };
  if (campeonato.status !== CAMP_INSCRICOES) {
    return { erro: 'Este campeonato já foi iniciado, encerrado ou cancelado.' };
  }

  const aprovadas = campeonato.registrations.filter((r) => r.status === INSC_APROVADA);
  const pendentes = campeonato.registrations.filter((r) => r.status === INSC_PENDENTE);
  if (aprovadas.length < 2) {
    return { erro: 'É preciso ter pelo menos 2 times aprovados para iniciar o campeonato.' };
  }

  // Sorteio do chaveamento
  const sorteados = embaralhar(
    aprovadas.map((r) => ({ id: r.team.id as string | null, name: r.team.name })),
    (limite) => randomInt(limite)
  );
  const { partidas } = gerarChaveamento(sorteados);

  try {
    await prisma.$transaction([
      prisma.match.createMany({
        data: partidas.map((p) => ({
          tournamentId: campeonatoId,
          round: p.round,
          position: p.position,
          teamAId: p.teamA?.id ?? null,
          teamAName: p.teamA?.name ?? null,
          teamBId: p.teamB?.id ?? null,
          teamBName: p.teamB?.name ?? null,
          scoreA: p.scoreA,
          scoreB: p.scoreB,
          winnerSide: p.winnerSide,
        })),
      }),
      // Inscrições que ficaram pendentes não entram no campeonato
      prisma.registration.deleteMany({ where: { tournamentId: campeonatoId, status: INSC_PENDENTE } }),
      prisma.tournament.update({ where: { id: campeonatoId }, data: { status: CAMP_ANDAMENTO } }),
    ]);
  } catch (error) {
    console.error('Erro ao iniciar campeonato:', error);
    return { erro: 'Não foi possível iniciar o campeonato. Tente novamente.' };
  }

  for (const p of pendentes) {
    await registrarLog(admin, {
      acao: ACOES_ADMIN.INSCRICAO_RECUSADA,
      alvo: `${campeonato.name} (time ${p.team.name})`,
      motivo: 'Inscrição não foi aprovada antes do início do campeonato',
      timeId: p.team.id,
    });
  }
  await registrarLog(admin, {
    acao: ACOES_ADMIN.CAMPEONATO_INICIADO,
    alvo: campeonato.name,
    motivo: `${aprovadas.length} times no chaveamento`,
  });

  revalidarCampeonato(campeonatoId);
  return { sucesso: 'Campeonato iniciado! O chaveamento foi sorteado.' };
}

export async function cancelarCampeonato(
  campeonatoId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const m = validarMotivo(formData);
  if (!m.ok) return { erro: m.erro };

  const campeonato = await prisma.tournament.findUnique({ where: { id: campeonatoId } });
  if (!campeonato) return { erro: 'Campeonato não encontrado.' };
  if (campeonato.status === CAMP_CANCELADO) return { erro: 'Este campeonato já foi cancelado.' };
  if (campeonato.status === CAMP_ENCERRADO) return { erro: 'Um campeonato encerrado não pode ser cancelado.' };

  await prisma.tournament.update({ where: { id: campeonatoId }, data: { status: CAMP_CANCELADO } });
  await registrarLog(admin, {
    acao: ACOES_ADMIN.CAMPEONATO_CANCELADO,
    alvo: campeonato.name,
    motivo: m.dados.motivo,
  });

  revalidarCampeonato(campeonatoId);
  return { sucesso: 'Campeonato cancelado.' };
}

export async function registrarResultado(
  partidaId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const textoA = texto(formData, 'scoreA');
  const textoB = texto(formData, 'scoreB');
  if (textoA === '' || textoB === '') return { erro: 'Informe o placar dos dois times.' };
  const scoreA = Number(textoA);
  const scoreB = Number(textoB);

  const partidaBanco = await prisma.match.findUnique({
    where: { id: partidaId },
    include: { tournament: { include: { matches: true } } },
  });
  if (!partidaBanco) return { erro: 'Partida não encontrada.' };

  const campeonato = partidaBanco.tournament;
  if (campeonato.status !== CAMP_ANDAMENTO && campeonato.status !== CAMP_ENCERRADO) {
    return { erro: 'Este campeonato não está em andamento.' };
  }

  // Monta a estrutura em memória, aplica o resultado e grava só o que mudou
  const partidas: Partida[] = campeonato.matches.map((x) => ({
    round: x.round,
    position: x.position,
    teamA: x.teamAName ? { id: x.teamAId, name: x.teamAName } : null,
    teamB: x.teamBName ? { id: x.teamBId, name: x.teamBName } : null,
    scoreA: x.scoreA,
    scoreB: x.scoreB,
    winnerSide: x.winnerSide === 'A' || x.winnerSide === 'B' ? x.winnerSide : null,
  }));
  const totalRodadas = Math.max(...partidas.map((x) => x.round));

  const resultado = aplicarResultado(partidas, totalRodadas, partidaBanco.round, partidaBanco.position, scoreA, scoreB);
  if (resultado.erro) return { erro: resultado.erro };

  try {
    await prisma.$transaction([
      ...resultado.alteradas.map((p) =>
        prisma.match.update({
          where: {
            tournamentId_round_position: {
              tournamentId: campeonato.id,
              round: p.round,
              position: p.position,
            },
          },
          data: {
            teamAId: p.teamA?.id ?? null,
            teamAName: p.teamA?.name ?? null,
            teamBId: p.teamB?.id ?? null,
            teamBName: p.teamB?.name ?? null,
            scoreA: p.scoreA,
            scoreB: p.scoreB,
            winnerSide: p.winnerSide,
          },
        })
      ),
      // Final decidida: grava campeão e vice e encerra o campeonato
      ...(resultado.campeao && resultado.vice
        ? [
            prisma.tournament.update({
              where: { id: campeonato.id },
              data: {
                status: CAMP_ENCERRADO,
                championName: resultado.campeao.name,
                runnerUpName: resultado.vice.name,
              },
            }),
          ]
        : []),
    ]);
  } catch (error) {
    console.error('Erro ao registrar resultado:', error);
    return { erro: 'Não foi possível salvar o resultado. Tente novamente.' };
  }

  const partida = resultado.alteradas[0];
  await registrarLog(admin, {
    acao: ACOES_ADMIN.RESULTADO_REGISTRADO,
    alvo: `${partida.teamA?.name} ${scoreA} x ${scoreB} ${partida.teamB?.name} (${campeonato.name})`,
  });

  revalidarCampeonato(campeonato.id);
  return {
    sucesso: resultado.campeao
      ? `Final registrada! Campeão: ${resultado.campeao.name}.`
      : 'Resultado salvo. O vencedor avançou para a próxima rodada.',
  };
}

/* =========================================================================
   MODERAÇÃO (sempre com MOTIVO obrigatório, que fica no histórico)
   ========================================================================= */

export async function removerJogadorAdmin(
  timeId: string,
  jogadorId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const m = validarMotivo(formData);
  if (!m.ok) return { erro: m.erro };

  const jogador = await prisma.player.findFirst({
    where: { id: jogadorId, teamId: timeId },
    include: { team: { select: { name: true } } },
  });
  if (!jogador) return { erro: 'Este jogador não existe mais.' };

  await prisma.player.delete({ where: { id: jogadorId } });
  await apagarImagem(jogador.avatarUrl);
  await registrarLog(admin, {
    acao: ACOES_ADMIN.JOGADOR_REMOVIDO,
    alvo: `${jogador.nickname} (time ${jogador.team.name})`,
    motivo: m.dados.motivo,
    timeId,
  });

  revalidatePath(`/times/${timeId}`);
  revalidatePath(`/equipes/${timeId}`);
  revalidatePath('/equipes');
  revalidatePath('/admin', 'layout');
  return { sucesso: 'Jogador removido do time.' };
}

export async function excluirTimeAdmin(
  timeId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const m = validarMotivo(formData);
  if (!m.ok) return { erro: m.erro };

  const time = await prisma.team.findUnique({
    where: { id: timeId },
    include: { players: { select: { avatarUrl: true } } },
  });
  if (!time) return { erro: 'Este time não existe mais.' };

  try {
    await prisma.team.delete({ where: { id: timeId } });
  } catch (error) {
    console.error('Erro ao excluir time (admin):', error);
    return { erro: 'Não foi possível excluir o time. Tente novamente.' };
  }

  await Promise.all([apagarImagem(time.logoUrl), ...time.players.map((j) => apagarImagem(j.avatarUrl))]);
  await registrarLog(admin, {
    acao: ACOES_ADMIN.TIME_EXCLUIDO,
    alvo: time.name,
    motivo: m.dados.motivo,
  });

  revalidatePath('/');
  revalidatePath('/equipes');
  revalidatePath('/times');
  revalidatePath('/admin', 'layout');
  redirect('/admin/times');
}

/* =========================================================================
   USUÁRIOS (suspender e reativar)
   ========================================================================= */

export async function suspenderUsuario(
  usuarioId: string,
  _estado: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const m = validarMotivo(formData);
  if (!m.ok) return { erro: m.erro };

  const alvo = await prisma.user.findUnique({ where: { id: usuarioId } });
  if (!alvo) return { erro: 'Usuário não encontrado.' };
  if (alvo.id === admin.id) return { erro: 'Você não pode suspender a própria conta.' };
  if (ehAdmin(alvo.email)) return { erro: 'Não é possível suspender uma conta de administrador.' };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: alvo.id },
      data: { bannedAt: new Date(), banReason: m.dados.motivo },
    }),
    // Derruba na hora todos os aparelhos em que a pessoa estava logada
    prisma.session.deleteMany({ where: { userId: alvo.id } }),
  ]);
  await registrarLog(admin, {
    acao: ACOES_ADMIN.USUARIO_SUSPENSO,
    alvo: `${alvo.name} (${alvo.email})`,
    motivo: m.dados.motivo,
  });

  revalidatePath('/admin', 'layout');
  return { sucesso: 'Conta suspensa.' };
}

export async function reativarUsuario(usuarioId: string): Promise<EstadoForm> {
  const admin = await adminLogado();
  if (!admin) return { erro: SEM_PERMISSAO };

  const alvo = await prisma.user.findUnique({ where: { id: usuarioId } });
  if (!alvo) return { erro: 'Usuário não encontrado.' };

  await prisma.user.update({ where: { id: alvo.id }, data: { bannedAt: null, banReason: null } });
  await registrarLog(admin, {
    acao: ACOES_ADMIN.USUARIO_REATIVADO,
    alvo: `${alvo.name} (${alvo.email})`,
  });

  revalidatePath('/admin', 'layout');
  return { sucesso: 'Conta reativada.' };
}
