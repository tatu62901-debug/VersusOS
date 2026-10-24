// Regras e utilitários do sistema (fáceis de ajustar em um lugar só)

/* =========================================================================
   JOGOS
   Cada jogo define quantos jogadores um time precisa ter para se inscrever
   em campeonatos (min) e quantos cabem no elenco (max).
   ========================================================================= */

type ConfigJogo = {
  formato: string; // texto mostrado ao usuário
  min: number; // mínimo de jogadores para inscrever o time
  max: number; // máximo de jogadores no elenco (inclui reservas)
};

export const JOGOS_CONFIG = {
  VALORANT: { formato: '5 contra 5', min: 5, max: 7 },
  CS2: { formato: '5 contra 5', min: 5, max: 7 },
  'League of Legends': { formato: '5 contra 5', min: 5, max: 7 },
  'Rocket League': { formato: '3 contra 3', min: 3, max: 4 },
  'Rainbow Six Siege': { formato: '5 contra 5', min: 5, max: 7 },
  'Dota 2': { formato: '5 contra 5', min: 5, max: 7 },
  'Apex Legends': { formato: 'trios', min: 3, max: 4 },
  'Overwatch 2': { formato: '5 contra 5', min: 5, max: 7 },
  Fortnite: { formato: 'duplas ou esquadrões', min: 2, max: 4 },
  'Free Fire': { formato: 'esquadrão de 4', min: 4, max: 5 },
  'Clash Royale': { formato: '1 contra 1 (ou 2 contra 2)', min: 1, max: 2 },
  'Brawl Stars': { formato: '3 contra 3', min: 3, max: 4 },
  'Marvel Rivals': { formato: '6 contra 6', min: 6, max: 8 },
  'COD Warzone': { formato: 'trios ou esquadrões', min: 3, max: 4 },
  'EA Sports FC 26': { formato: '1 contra 1', min: 1, max: 2 },
  'Street Fighter 6': { formato: 'individual', min: 1, max: 1 },
  'Mortal Kombat 1': { formato: 'individual', min: 1, max: 1 },
  'Tekken 8': { formato: 'individual', min: 1, max: 1 },
} as const satisfies Record<string, ConfigJogo>;

export const JOGOS = Object.keys(JOGOS_CONFIG) as (keyof typeof JOGOS_CONFIG)[];

// Limites do jogo (se o jogo não existir mais na lista, usa um padrão seguro)
export function limitesDoJogo(jogo: string): ConfigJogo {
  return (JOGOS_CONFIG as Record<string, ConfigJogo>)[jogo] ?? { formato: '', min: 1, max: 10 };
}

/* =========================================================================
   CAMPEONATOS: status e prazos
   ========================================================================= */

export const CAMP_INSCRICOES = 'INSCRICOES';
export const CAMP_ANDAMENTO = 'EM_ANDAMENTO';
export const CAMP_ENCERRADO = 'ENCERRADO';
export const CAMP_CANCELADO = 'CANCELADO';

export const INSC_PENDENTE = 'PENDENTE';
export const INSC_APROVADA = 'APROVADA';

export type StatusCampeonato = {
  chave: 'ABERTO' | 'LOTADO' | 'PRAZO' | 'ANDAMENTO' | 'ENCERRADO' | 'CANCELADO';
  rotulo: string;
  aberto: boolean; // dá pra inscrever times agora?
  classe: string;
};

// O status mostrado combina o status gravado, o prazo de inscrição e as vagas.
// "aprovados" = quantidade de inscrições APROVADAS.
export function statusCampeonato(
  campeonato: { status: string; registrationDeadline: Date; maxTeams: number },
  aprovados: number
): StatusCampeonato {
  if (campeonato.status === CAMP_CANCELADO) {
    return { chave: 'CANCELADO', rotulo: 'Cancelado', aberto: false, classe: 'text-red-400 border-red-500/30 bg-red-500/10' };
  }
  if (campeonato.status === CAMP_ENCERRADO) {
    return { chave: 'ENCERRADO', rotulo: 'Encerrado', aberto: false, classe: 'text-slate-400 border-slate-600/40 bg-slate-800/60' };
  }
  if (campeonato.status === CAMP_ANDAMENTO) {
    return { chave: 'ANDAMENTO', rotulo: 'Em andamento', aberto: false, classe: 'text-sky-400 border-sky-500/30 bg-sky-500/10' };
  }
  if (campeonato.registrationDeadline.getTime() <= Date.now()) {
    return { chave: 'PRAZO', rotulo: 'Inscrições encerradas', aberto: false, classe: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
  }
  if (aprovados >= campeonato.maxTeams) {
    return { chave: 'LOTADO', rotulo: 'Vagas esgotadas', aberto: false, classe: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
  }
  return { chave: 'ABERTO', rotulo: 'Inscrições abertas', aberto: true, classe: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
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

export function formatarDataHora(data: Date) {
  return data.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

// AAAA-MM-DD no horário do Brasil (formato do campo <input type="date">)
export function dataParaInput(data: Date) {
  return data.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/* =========================================================================
   Imagens, pedidos de entrada e login
   ========================================================================= */

export const IMAGEM_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const IMAGEM_MAX_MB = 2;

export const PEDIDO_PENDENTE = 'PENDENTE';
export const PEDIDO_RECUSADO = 'RECUSADO';

export const MAX_TENTATIVAS_LOGIN_EMAIL = 5; // falhas por e-mail na janela
export const MAX_TENTATIVAS_LOGIN_IP = 20; // falhas por IP na janela
export const JANELA_LOGIN_MINUTOS = 15;
