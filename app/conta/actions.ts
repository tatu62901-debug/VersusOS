'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { exigirUsuario } from '@/lib/permissoes';
import { destroySession, encerrarOutrasSessoes } from '@/lib/session';
import { apagarImagem } from '@/lib/imagem';
import { ehAdmin, emailReservado } from '@/lib/admin';
import {
  type EstadoForm,
  texto,
  valoresDe,
  validarPerfil,
  validarNovaSenha,
} from '@/lib/validacao';

// Busca o hash da senha da conta de e-mail/senha do usuário
async function buscarHashDaSenha(userId: string) {
  const conta = await prisma.account.findFirst({
    where: { userId, providerId: 'credential' },
    select: { id: true, password: true },
  });
  return conta;
}

/* =========================================================================
   EDITAR PERFIL (nome e e-mail)
   ========================================================================= */

export async function atualizarPerfil(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const user = await exigirUsuario();
  const valores = valoresDe(formData, ['name', 'email']);

  const v = validarPerfil(formData);
  if (!v.ok) return { erro: v.erro, valores };

  // O e-mail é o que define quem é administrador, então ele não pode ser mexido
  if (v.dados.email !== user.email.toLowerCase()) {
    if (ehAdmin(user.email)) {
      return { erro: 'Contas de administrador não podem trocar o e-mail.', valores };
    }
    if (emailReservado(v.dados.email)) {
      return { erro: 'Este e-mail é reservado e não pode ser usado.', valores };
    }
  }

  const emailEmUso = await prisma.user.findFirst({
    where: { email: v.dados.email, NOT: { id: user.id } },
  });
  if (emailEmUso) return { erro: 'Este e-mail já está em uso por outra conta.', valores };

  try {
    await prisma.user.update({ where: { id: user.id }, data: v.dados });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return { erro: 'Não foi possível salvar o perfil. Tente novamente.', valores };
  }

  // O nome aparece no topo de todas as páginas
  revalidatePath('/', 'layout');
  return { sucesso: 'Perfil atualizado com sucesso!', valores: { name: v.dados.name, email: v.dados.email } };
}

/* =========================================================================
   TROCAR SENHA
   ========================================================================= */

export async function trocarSenha(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const user = await exigirUsuario();

  // Senhas não são texto "aparado": usamos o valor exatamente como foi digitado
  const senhaAtual = String(formData.get('senhaAtual') ?? '');
  const senhaNova = String(formData.get('senhaNova') ?? '');
  const confirmacao = String(formData.get('confirmacao') ?? '');

  const v = validarNovaSenha(senhaAtual, senhaNova, confirmacao);
  if (!v.ok) return { erro: v.erro };

  const conta = await buscarHashDaSenha(user.id);
  if (!conta?.password) return { erro: 'Não foi possível verificar a sua senha atual.' };

  const senhaCorreta = await bcrypt.compare(senhaAtual, conta.password);
  if (!senhaCorreta) return { erro: 'A senha atual está incorreta.' };

  try {
    const novoHash = await bcrypt.hash(senhaNova, 10);
    await prisma.account.update({
      where: { id: conta.id },
      data: { password: novoHash, updatedAt: new Date() },
    });
    // Por segurança, desconecta os outros aparelhos (esta sessão continua)
    await encerrarOutrasSessoes(user.id);
  } catch (error) {
    console.error('Erro ao trocar senha:', error);
    return { erro: 'Não foi possível trocar a senha. Tente novamente.' };
  }

  return { sucesso: 'Senha alterada com sucesso! Os outros aparelhos foram desconectados.' };
}

/* =========================================================================
   EXCLUIR A PRÓPRIA CONTA
   - Pede a senha pra confirmar.
   - Não deixa excluir se a pessoa for dona de algum time (evita apagar o
     time de outras pessoas sem querer): ela precisa passar a liderança
     ou excluir o time antes.
   ========================================================================= */

export async function excluirConta(_estado: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const user = await exigirUsuario();

  if (ehAdmin(user.email)) {
    return { erro: 'Contas de administrador não podem ser excluídas.' };
  }

  const senha = String(formData.get('senha') ?? '');
  if (!senha) return { erro: 'Digite a sua senha para confirmar.' };

  const timesDoUsuario = await prisma.team.findMany({
    where: { userId: user.id },
    select: { name: true },
  });
  if (timesDoUsuario.length > 0) {
    const nomes = timesDoUsuario.map((t) => t.name).join(', ');
    return {
      erro: `Você é dono de ${timesDoUsuario.length === 1 ? 'um time' : 'times'} (${nomes}). Passe a liderança ou exclua ${timesDoUsuario.length === 1 ? 'o time' : 'os times'} antes de excluir a conta.`,
    };
  }

  const conta = await buscarHashDaSenha(user.id);
  if (!conta?.password || !(await bcrypt.compare(senha, conta.password))) {
    return { erro: 'Senha incorreta.' };
  }

  // Fotos dos jogadores ligados a esta conta (serão apagadas do Blob)
  const jogadores = await prisma.player.findMany({
    where: { userId: user.id },
    select: { avatarUrl: true },
  });

  try {
    await prisma.$transaction([
      prisma.player.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }), // sessões, conta e pedidos saem junto (Cascade)
    ]);
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    return { erro: 'Não foi possível excluir a conta. Tente novamente.' };
  }

  await Promise.all(jogadores.map((j) => apagarImagem(j.avatarUrl)));
  await destroySession();

  revalidatePath('/', 'layout');
  redirect('/');
}
