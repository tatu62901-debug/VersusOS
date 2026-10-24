import { prisma } from '@/lib/prisma';

// Quem é administrador é definido por uma LISTA DE E-MAILS.
// Dá pra mudar a lista com a variável ADMIN_EMAILS (separada por vírgula).
// Se ela não existir, vale a lista padrão abaixo.
const ADMINS_PADRAO = ['admin1@versusos.com', 'admin2@versusos.com'];

export function emailsAdmin(): string[] {
  const configurado = process.env.ADMIN_EMAILS;
  if (!configurado) return ADMINS_PADRAO;

  const lista = configurado
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.length > 0 ? lista : ADMINS_PADRAO;
}

export function ehAdmin(email?: string | null) {
  return !!email && emailsAdmin().includes(email.trim().toLowerCase());
}

// E-mails de admin são "reservados": ninguém pode se cadastrar com eles
export const emailReservado = ehAdmin;

export const ACOES_ADMIN = {
  CAMPEONATO_CRIADO: 'CAMPEONATO_CRIADO',
  CAMPEONATO_EDITADO: 'CAMPEONATO_EDITADO',
  CAMPEONATO_EXCLUIDO: 'CAMPEONATO_EXCLUIDO',
  CAMPEONATO_INICIADO: 'CAMPEONATO_INICIADO',
  CAMPEONATO_CANCELADO: 'CAMPEONATO_CANCELADO',
  INSCRICAO_APROVADA: 'INSCRICAO_APROVADA',
  INSCRICAO_RECUSADA: 'INSCRICAO_RECUSADA',
  RESULTADO_REGISTRADO: 'RESULTADO_REGISTRADO',
  INSCRICAO_REMOVIDA: 'INSCRICAO_REMOVIDA',
  JOGADOR_REMOVIDO: 'JOGADOR_REMOVIDO',
  TIME_EXCLUIDO: 'TIME_EXCLUIDO',
  USUARIO_SUSPENSO: 'USUARIO_SUSPENSO',
  USUARIO_REATIVADO: 'USUARIO_REATIVADO',
} as const;

export type AcaoAdmin = (typeof ACOES_ADMIN)[keyof typeof ACOES_ADMIN];

// Registra uma ação de admin. Nunca derruba a ação principal se o registro falhar.
export async function registrarLog(
  admin: { name: string; email: string },
  dados: { acao: AcaoAdmin; alvo: string; motivo?: string | null; timeId?: string | null }
) {
  try {
    await prisma.adminLog.create({
      data: {
        action: dados.acao,
        targetName: dados.alvo,
        reason: dados.motivo ?? null,
        teamId: dados.timeId ?? null,
        adminName: admin.name,
        adminEmail: admin.email,
      },
    });
  } catch (error) {
    console.error('Erro ao registrar log de admin:', error);
  }
}

// Frase pronta para mostrar no histórico do admin
export function descreverAcao(acao: string, alvo: string) {
  switch (acao) {
    case ACOES_ADMIN.CAMPEONATO_CRIADO:
      return `Criou o campeonato ${alvo}`;
    case ACOES_ADMIN.CAMPEONATO_EDITADO:
      return `Editou o campeonato ${alvo}`;
    case ACOES_ADMIN.CAMPEONATO_EXCLUIDO:
      return `Excluiu o campeonato ${alvo}`;
    case ACOES_ADMIN.CAMPEONATO_INICIADO:
      return `Iniciou o campeonato ${alvo} (chaveamento sorteado)`;
    case ACOES_ADMIN.CAMPEONATO_CANCELADO:
      return `Cancelou o campeonato ${alvo}`;
    case ACOES_ADMIN.INSCRICAO_APROVADA:
      return `Aprovou a inscrição no campeonato ${alvo}`;
    case ACOES_ADMIN.INSCRICAO_RECUSADA:
      return `Recusou a inscrição no campeonato ${alvo}`;
    case ACOES_ADMIN.RESULTADO_REGISTRADO:
      return `Registrou o resultado: ${alvo}`;
    case ACOES_ADMIN.INSCRICAO_REMOVIDA:
      return `Removeu a inscrição no campeonato ${alvo}`;
    case ACOES_ADMIN.JOGADOR_REMOVIDO:
      return `Removeu o jogador ${alvo}`;
    case ACOES_ADMIN.TIME_EXCLUIDO:
      return `Excluiu o time ${alvo}`;
    case ACOES_ADMIN.USUARIO_SUSPENSO:
      return `Suspendeu a conta de ${alvo}`;
    case ACOES_ADMIN.USUARIO_REATIVADO:
      return `Reativou a conta de ${alvo}`;
    default:
      return `${acao}: ${alvo}`;
  }
}

// Frase mostrada ao DONO do time quando a administração mexe no time dele
export function avisoParaTime(acao: string, alvo: string) {
  switch (acao) {
    case ACOES_ADMIN.JOGADOR_REMOVIDO:
      return `O jogador ${alvo} foi removido do time pela administração.`;
    case ACOES_ADMIN.INSCRICAO_REMOVIDA:
      return `O time foi removido do campeonato ${alvo} pela administração.`;
    case ACOES_ADMIN.INSCRICAO_APROVADA:
      return `A inscrição do time no campeonato ${alvo} foi aprovada.`;
    case ACOES_ADMIN.INSCRICAO_RECUSADA:
      return `A inscrição do time no campeonato ${alvo} foi recusada.`;
    case ACOES_ADMIN.CAMPEONATO_CANCELADO:
      return `O campeonato ${alvo} foi cancelado pela administração.`;
    default:
      return descreverAcao(acao, alvo);
  }
}
