import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { aplicarResultado, gerarChaveamento, type Partida } from "../lib/chaveamento";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED });
const prisma = new PrismaClient({ adapter });

// Dados fictícios, mas realistas (requisitos R1 e R6).
// As datas ficam em 2027 pra as inscrições continuarem abertas durante a avaliação.
const DIA = 24 * 60 * 60 * 1000;

const IMAGENS = [
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=600&auto=format&fit=crop",
];

function camp(
  name: string,
  game: string,
  description: string,
  prize: number,
  maxTeams: number,
  inicio: string, // AAAA-MM-DD
  imagem: number
) {
  const startDate = new Date(`${inicio}T15:00:00Z`);
  return {
    name,
    game,
    description,
    prize,
    maxTeams,
    startDate,
    // inscrições até 7 dias antes do início (fim do dia, horário de Brasília)
    registrationDeadline: new Date(new Date(startDate.getTime() - 7 * DIA).toISOString().slice(0, 10) + "T23:59:59-03:00"),
    imageUrl: IMAGENS[imagem % IMAGENS.length],
  };
}

const campeonatos = [
  camp("Copa dos Campeões VALORANT", "VALORANT", "Torneio eliminatório em formato melhor de 3, com final presencial transmitida ao vivo.", 15000, 16, "2027-03-20", 0),
  camp("Liga Serrana de Counter-Strike 2", "CS2", "Mata-mata em partidas melhor de 3 entre os melhores times da região.", 10000, 32, "2027-04-10", 1),
  camp("Challenger League of Legends", "League of Legends", "Campeonato para equipes amadoras, com chaveamento de eliminação simples.", 20000, 16, "2027-04-24", 2),
  camp("Torneio Masters de Rocket League", "Rocket League", "Disputa 3x3 em mata-mata, aberta a times de todo o país.", 5000, 64, "2027-05-08", 3),
  camp("Open Cup Rainbow Six Siege", "Rainbow Six Siege", "Copa aberta com chaveamento por sorteio e finais em melhor de 5.", 8000, 16, "2027-05-22", 4),
  camp("Circuitinho de Dota 2", "Dota 2", "Torneio de eliminação simples com grande final transmitida.", 6000, 8, "2027-06-12", 5),
  camp("Copa Apex Legends Arena", "Apex Legends", "Mata-mata de trios com confrontos diretos e final em melhor de 3.", 4000, 16, "2027-06-26", 6),
  camp("Showdown Overwatch 2", "Overwatch 2", "Torneio 5x5 em eliminação simples, com transmissão de todas as partidas.", 7500, 16, "2027-07-10", 7),
  camp("Copa Relâmpago de CS2", "CS2", "Torneio de um dia só, com partidas rápidas e premiação para campeão e vice.", 3000, 16, "2027-08-07", 1),
  camp("Liga Universitária VALORANT", "VALORANT", "Campeonato exclusivo para equipes formadas por estudantes universitários.", 9000, 16, "2027-09-04", 0),
  // ---- jogos mais simples de organizar (individuais e duplas/trios) ----
  camp("Copa Fortnite Duplas", "Fortnite", "Torneio de duplas em mata-mata, com partidas melhor de 3.", 4000, 32, "2027-03-27", 3),
  camp("Liga Free Fire Squads", "Free Fire", "Mata-mata de esquadrões de 4 jogadores, aberto a todo o Brasil.", 6000, 16, "2027-04-17", 6),
  camp("Torneio Clash Royale Arena", "Clash Royale", "Disputa 1x1 em eliminação simples, uma partida rápida atrás da outra.", 2000, 64, "2027-05-01", 5),
  camp("Desafio Brawl Stars 3x3", "Brawl Stars", "Times de 3 jogadores se enfrentam em mata-mata com final melhor de 5.", 2500, 32, "2027-05-15", 7),
  camp("Marvel Rivals Open", "Marvel Rivals", "Campeonato 6x6 com chaveamento de eliminação simples e final ao vivo.", 8000, 16, "2027-06-05", 2),
  camp("Warzone Trios Cup", "COD Warzone", "Copa de trios com confrontos diretos e final decidida em melhor de 3.", 5000, 16, "2027-07-17", 4),
  camp("Taça EA Sports FC 26", "EA Sports FC 26", "Torneio 1x1 de futebol virtual em mata-mata, com final em ida e volta.", 3500, 32, "2027-07-31", 1),
  camp("Street Fighter 6 Championship", "Street Fighter 6", "Torneio individual de luta em eliminação simples, partidas melhor de 3.", 3000, 32, "2027-08-21", 0),
  camp("Mortal Kombat 1 Fatality Cup", "Mortal Kombat 1", "Chaveamento individual de eliminação simples com final em melhor de 5.", 2500, 16, "2027-09-18", 3),
  camp("Torneio Tekken 8 Arena", "Tekken 8", "Disputa individual em mata-mata aberta a jogadores de todo o país.", 3000, 32, "2027-10-09", 6),
];

/* =========================================================================
   Campeonatos de demonstração (um encerrado e um em andamento),
   com times fictícios, para o site já mostrar chaveamento e campeão.
   ========================================================================= */

const FUNCOES = {
  VALORANT: ["Capitão", "Duelista", "Controlador", "Sentinela", "Iniciador"],
  CS2: ["IGL", "AWPer", "Entry", "Suporte", "Lurker"],
};
const APELIDOS = [
  "Shadow", "Blitz", "Nox", "Raven", "Kairo", "Zeta", "Onyx", "Flux", "Vortex", "Echo",
  "Pixel", "Titan", "Cobra", "Nitro", "Astro", "Rush", "Fenix", "Jinx", "Bolt", "Ghost",
  "Storm", "Lynx", "Orion", "Viper", "Drako", "Mirage", "Quasar", "Zorro", "Sable", "Atlas",
  "Hawk", "Neon", "Omen", "Pulse", "Rogue", "Spike", "Tango", "Umbra", "Volt", "Wraith",
];

async function criarTimeDemo(
  dono: string,
  indice: number,
  nome: string,
  jogo: "VALORANT" | "CS2",
  descricao: string
) {
  const existente = await prisma.team.findUnique({ where: { name: nome } });
  if (existente) return existente;

  const funcoes = FUNCOES[jogo];
  return prisma.team.create({
    data: {
      name: nome,
      game: jogo,
      description: descricao,
      inviteCode: `DEMO${String(indice).padStart(4, "0")}`,
      userId: dono,
      players: {
        create: funcoes.map((funcao, i) => ({
          nickname: `${APELIDOS[(indice * 5 + i) % APELIDOS.length]}${indice * 5 + i > APELIDOS.length - 1 ? indice : ""}`,
          role: funcao,
          age: 18 + ((indice * 3 + i * 2) % 10),
        })),
      },
    },
  });
}

// Resultado de mentira, mas determinístico: o time que veio primeiro na lista vence
function simularRodada(partidas: Partida[], totalRodadas: number, ordem: string[], ate: number) {
  let jogadas = 0;
  for (let r = 1; r <= totalRodadas; r++) {
    for (const p of partidas.filter((x) => x.round === r).sort((a, b) => a.position - b.position)) {
      if (jogadas >= ate) return;
      if (!p.teamA || !p.teamB || p.winnerSide) continue;
      const aVence = ordem.indexOf(p.teamA.name) < ordem.indexOf(p.teamB.name);
      const apertado = (p.round + p.position) % 2 === 0;
      const res = aplicarResultado(partidas, totalRodadas, p.round, p.position, aVence ? 2 : apertado ? 1 : 0, aVence ? (apertado ? 1 : 0) : 2);
      if (res.erro) throw new Error(res.erro);
      jogadas++;
    }
  }
}

async function gravarChave(campeonatoId: string, partidas: Partida[]) {
  await prisma.match.deleteMany({ where: { tournamentId: campeonatoId } });
  await prisma.match.createMany({
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
  });
}

async function criarDemonstracao() {
  const dono = await prisma.user.upsert({
    where: { email: "demo@versusos.com" },
    update: {},
    create: {
      name: "Organização Demo",
      email: "demo@versusos.com",
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: crypto.randomUUID(),
          providerId: "credential",
          password: await bcrypt.hash(crypto.randomUUID(), 10), // ninguém sabe a senha: conta só de vitrine
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    },
  });

  // ---------- 1) campeonato ENCERRADO (8 times, com campeão e vice) ----------
  const nomeEncerrado = "Copa Abertura VALORANT 2026";
  if (!(await prisma.tournament.findUnique({ where: { name: nomeEncerrado } }))) {
    const nomes = ["Pantera Sombria", "Falcões do Norte", "Nova Era Gaming", "Tempestade Vermelha", "Lobos de Ferro", "Cometa Azul", "Guardiões da Aurora", "Rota 66 eSports"];
    const times = [];
    for (let i = 0; i < nomes.length; i++) {
      times.push(await criarTimeDemo(dono.id, i + 1, nomes[i], "VALORANT", "Time fictício de demonstração."));
    }

    const c = await prisma.tournament.create({
      data: {
        name: nomeEncerrado,
        game: "VALORANT",
        description: "Primeira edição do campeonato de abertura, já finalizada. Veja o chaveamento completo.",
        prize: 12000,
        maxTeams: 8,
        startDate: new Date("2026-08-15T15:00:00Z"),
        registrationDeadline: new Date("2026-08-08T23:59:59-03:00"),
        status: "ENCERRADO",
        imageUrl: IMAGENS[0],
      },
    });
    await prisma.registration.createMany({
      data: times.map((t) => ({ teamId: t.id, tournamentId: c.id, status: "APROVADA" })),
    });

    const refs = times.map((t) => ({ id: t.id as string | null, name: t.name }));
    const { partidas, totalRodadas } = gerarChaveamento(refs);
    simularRodada(partidas, totalRodadas, nomes, 999);
    await gravarChave(c.id, partidas);

    const final = partidas.find((p) => p.round === totalRodadas)!;
    const campeao = final.winnerSide === "A" ? final.teamA! : final.teamB!;
    const vice = final.winnerSide === "A" ? final.teamB! : final.teamA!;
    await prisma.tournament.update({
      where: { id: c.id },
      data: { championName: campeao.name, runnerUpName: vice.name },
    });
    console.log(`✔ Campeonato de demonstração encerrado: ${nomeEncerrado} (campeão: ${campeao.name})`);
  }

  // ---------- 2) campeonato EM ANDAMENTO (4 times, semifinal 1 já jogada) ----------
  const nomeAndamento = "Desafio Capixaba de CS2";
  if (!(await prisma.tournament.findUnique({ where: { name: nomeAndamento } }))) {
    const nomes = ["Vulcão Esports", "Maré Alta Gaming", "Quimera Team", "Aurora Boreal CS"];
    const times = [];
    for (let i = 0; i < nomes.length; i++) {
      times.push(await criarTimeDemo(dono.id, 20 + i, nomes[i], "CS2", "Time fictício de demonstração."));
    }

    const c = await prisma.tournament.create({
      data: {
        name: nomeAndamento,
        game: "CS2",
        description: "Campeonato em andamento: acompanhe as semifinais e a grande final.",
        prize: 6000,
        maxTeams: 8,
        startDate: new Date("2026-10-17T15:00:00Z"),
        registrationDeadline: new Date("2026-10-10T23:59:59-03:00"),
        status: "EM_ANDAMENTO",
        imageUrl: IMAGENS[1],
      },
    });
    await prisma.registration.createMany({
      data: times.map((t) => ({ teamId: t.id, tournamentId: c.id, status: "APROVADA" })),
    });

    const refs = times.map((t) => ({ id: t.id as string | null, name: t.name }));
    const { partidas, totalRodadas } = gerarChaveamento(refs);
    simularRodada(partidas, totalRodadas, nomes, 1); // só a 1ª semifinal foi jogada
    await gravarChave(c.id, partidas);
    console.log(`✔ Campeonato de demonstração em andamento: ${nomeAndamento}`);
  }

  // ---------- 3) inscrições de exemplo num campeonato aberto (uma aprovada, uma pendente) ----------
  const aberto = await prisma.tournament.findUnique({ where: { name: "Copa dos Campeões VALORANT" } });
  const aprovada = await prisma.team.findUnique({ where: { name: "Falcões do Norte" } });
  const pendente = await prisma.team.findUnique({ where: { name: "Pantera Sombria" } });
  if (aberto && aprovada && pendente) {
    await prisma.registration.upsert({
      where: { teamId_tournamentId: { teamId: aprovada.id, tournamentId: aberto.id } },
      update: {},
      create: { teamId: aprovada.id, tournamentId: aberto.id, status: "APROVADA" },
    });
    await prisma.registration.upsert({
      where: { teamId_tournamentId: { teamId: pendente.id, tournamentId: aberto.id } },
      update: {},
      create: { teamId: pendente.id, tournamentId: aberto.id, status: "PENDENTE" },
    });
  }
}

// Contas de administrador (o admin é definido pela lista de e-mails em lib/admin.ts).
// A senha inicial é "admin" (ou o valor de ADMIN_SEED_PASSWORD). TROQUE depois de publicar o site!
const admins = [
  { name: "Admin 1", email: "admin1@versusos.com" },
  { name: "Admin 2", email: "admin2@versusos.com" },
];

async function criarAdmins() {
  const senha = process.env.ADMIN_SEED_PASSWORD || "admin";
  const hash = await bcrypt.hash(senha, 10);

  for (const a of admins) {
    const existente = await prisma.user.findUnique({ where: { email: a.email } });
    if (existente) continue; // não mexe em conta que já existe (nem na senha dela)

    await prisma.user.create({
      data: {
        name: a.name,
        email: a.email,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: crypto.randomUUID(),
            providerId: "credential",
            password: hash,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
    });
    console.log(`✔ Conta admin criada: ${a.email}`);
  }
}

async function main() {
  for (const c of campeonatos) {
    // Só cria se ainda não existir (assim o seed não desfaz o que o admin editou pelo site)
    await prisma.tournament.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }
  console.log(`✔ ${campeonatos.length} campeonatos garantidos no banco.`);
  await criarAdmins();
  await criarDemonstracao();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
