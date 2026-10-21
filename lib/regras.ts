// Regras e utilitários do sistema (fáceis de ajustar em um lugar só)

export const JOGOS = [
  'VALORANT',
  'CS2',
  'League of Legends',
  'Rocket League',
  'Rainbow Six Siege',
  'Dota 2',
  'Apex Legends',
  'Overwatch 2',
] as const;

export const MAX_JOGADORES = 10; // máximo de jogadores por time
export const MIN_JOGADORES_INSCRICAO = 2; // mínimo de jogadores pra inscrever o time

export type StatusCampeonato = {
  rotulo: string;
  aberto: boolean;
  classe: string;
};

// O status é calculado pela data de início e pelo número de vagas
export function statusCampeonato(
  campeonato: { startDate: Date; maxTeams: number },
  inscritos: number
): StatusCampeonato {
  if (campeonato.startDate.getTime() <= Date.now()) {
    return {
      rotulo: 'Encerrado',
      aberto: false,
      classe: 'text-slate-400 border-slate-600/40 bg-slate-800/60',
    };
  }
  if (inscritos >= campeonato.maxTeams) {
    return {
      rotulo: 'Vagas esgotadas',
      aberto: false,
      classe: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    };
  }
  return {
    rotulo: 'Inscrições abertas',
    aberto: true,
    classe: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  };
}

export function formatarData(data: Date) {
  return data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function formatarPremio(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

// ---- Imagens (logo do time e foto do jogador) ----
export const IMAGEM_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const IMAGEM_MAX_MB = 2;

// ---- Pedidos de entrada em time ----
export const PEDIDO_PENDENTE = 'PENDENTE';
export const PEDIDO_RECUSADO = 'RECUSADO';

// ---- Limite de tentativas de login ----
export const MAX_TENTATIVAS_LOGIN_EMAIL = 5; // falhas por e-mail na janela
export const MAX_TENTATIVAS_LOGIN_IP = 20; // falhas por IP na janela
export const JANELA_LOGIN_MINUTOS = 15;
