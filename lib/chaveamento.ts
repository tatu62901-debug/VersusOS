// Chaveamento de mata-mata (eliminação simples). Funções PURAS (sem banco de dados),
// por isso são fáceis de testar. As ações do admin só guardam o resultado no banco.
//
// Regras:
// - Sem disputa de 3º lugar: a final define apenas o CAMPEÃO e o VICE.
// - Se o número de times não for potência de 2, os melhores sorteados ganham "folga"
//   (avançam direto da 1ª rodada).

export type TimeRef = { id: string | null; name: string };

export type Partida = {
  round: number; // 1 = primeira rodada ... totalRodadas = final
  position: number; // posição da partida dentro da rodada (começa em 1)
  teamA: TimeRef | null;
  teamB: TimeRef | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerSide: 'A' | 'B' | null;
};

export type Chave = { partidas: Partida[]; totalRodadas: number };

// Ordem padrão de cabeças de chave: 8 -> [1,8,4,5,2,7,3,6]
// (o 1º enfrenta o último, e as folgas ficam espalhadas pelo chaveamento)
function ordemDeSementes(tamanho: number): number[] {
  let ordem = [1];
  while (ordem.length < tamanho) {
    const novoTamanho = ordem.length * 2;
    ordem = ordem.flatMap((s) => [s, novoTamanho + 1 - s]);
  }
  return ordem;
}

export function proximaPotenciaDe2(n: number) {
  let tamanho = 1;
  while (tamanho < n) tamanho *= 2;
  return tamanho;
}

// "times" deve vir na ordem do sorteio (o 1º é o cabeça de chave 1)
export function gerarChaveamento(times: TimeRef[]): Chave {
  if (times.length < 2) throw new Error('São necessários pelo menos 2 times.');

  const tamanho = proximaPotenciaDe2(times.length);
  const totalRodadas = Math.log2(tamanho);
  const ordem = ordemDeSementes(tamanho);

  const partidas: Partida[] = [];
  for (let r = 1; r <= totalRodadas; r++) {
    const quantidade = tamanho / 2 ** r;
    for (let p = 1; p <= quantidade; p++) {
      partidas.push({ round: r, position: p, teamA: null, teamB: null, scoreA: null, scoreB: null, winnerSide: null });
    }
  }
  const buscar = (round: number, position: number) =>
    partidas.find((x) => x.round === round && x.position === position)!;

  // Primeira rodada: semente > quantidade de times = folga
  for (let p = 1; p <= tamanho / 2; p++) {
    const sementeA = ordem[(p - 1) * 2];
    const sementeB = ordem[(p - 1) * 2 + 1];
    const partida = buscar(1, p);
    partida.teamA = sementeA <= times.length ? times[sementeA - 1] : null;
    partida.teamB = sementeB <= times.length ? times[sementeB - 1] : null;

    // Folga: o time que não tem adversário já avança para a próxima rodada
    if (!!partida.teamA !== !!partida.teamB && totalRodadas > 1) {
      partida.winnerSide = partida.teamA ? 'A' : 'B';
      const vencedor = partida.teamA ?? partida.teamB;
      const proxima = buscar(2, Math.ceil(p / 2));
      if (p % 2 === 1) proxima.teamA = vencedor;
      else proxima.teamB = vencedor;
    }
  }

  return { partidas, totalRodadas };
}

export type ResultadoAplicado = {
  erro?: string;
  alteradas: Partida[]; // partidas que mudaram (para gravar no banco)
  campeao?: TimeRef;
  vice?: TimeRef;
};

// Registra (ou corrige) o resultado de uma partida e leva o vencedor para a próxima rodada.
export function aplicarResultado(
  partidas: Partida[],
  totalRodadas: number,
  round: number,
  position: number,
  scoreA: number,
  scoreB: number
): ResultadoAplicado {
  const partida = partidas.find((x) => x.round === round && x.position === position);
  if (!partida) return { erro: 'Partida não encontrada.', alteradas: [] };
  if (!partida.teamA || !partida.teamB) {
    return { erro: 'Esta partida ainda não tem os dois times definidos.', alteradas: [] };
  }
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0 || scoreA > 99 || scoreB > 99) {
    return { erro: 'Os placares devem ser números inteiros entre 0 e 99.', alteradas: [] };
  }
  if (scoreA === scoreB) {
    return { erro: 'Não pode haver empate no mata-mata: informe um vencedor.', alteradas: [] };
  }

  const proxima = round < totalRodadas
    ? partidas.find((x) => x.round === round + 1 && x.position === Math.ceil(position / 2))
    : undefined;

  // Corrigir resultado só é permitido enquanto a partida seguinte não foi jogada
  if (partida.winnerSide && proxima?.winnerSide) {
    return { erro: 'Não dá pra corrigir: a partida seguinte já foi jogada.', alteradas: [] };
  }

  const lado: 'A' | 'B' = scoreA > scoreB ? 'A' : 'B';
  partida.scoreA = scoreA;
  partida.scoreB = scoreB;
  partida.winnerSide = lado;
  const vencedor = lado === 'A' ? partida.teamA : partida.teamB;
  const perdedor = lado === 'A' ? partida.teamB : partida.teamA;
  const alteradas = [partida];

  if (proxima) {
    if (position % 2 === 1) proxima.teamA = vencedor;
    else proxima.teamB = vencedor;
    alteradas.push(proxima);
    return { alteradas };
  }

  // Era a final
  return { alteradas, campeao: vencedor, vice: perdedor };
}

export function nomeDaRodada(round: number, totalRodadas: number) {
  const faltam = totalRodadas - round; // 0 = final
  if (faltam === 0) return 'Final';
  if (faltam === 1) return 'Semifinais';
  if (faltam === 2) return 'Quartas de final';
  if (faltam === 3) return 'Oitavas de final';
  return `Rodada de ${2 ** (faltam + 1)}`;
}

// Sorteio justo (Fisher-Yates com números aleatórios do Node)
export function embaralhar<T>(lista: T[], sorteio: (limite: number) => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = sorteio(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Uma partida é "folga" quando só tem um time e o vencedor já foi definido na geração
export function ehFolga(partida: Partida) {
  return partida.round === 1 && !!partida.winnerSide && (!partida.teamA || !partida.teamB);
}
