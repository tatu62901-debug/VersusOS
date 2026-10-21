import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED });
const prisma = new PrismaClient({ adapter });

// Dados fictícios, mas realistas (requisitos R1 e R6).
// As datas ficam em 2027 pra as inscrições continuarem abertas durante a avaliação.
const campeonatos = [
  {
    name: "Copa dos Campeões VALORANT",
    game: "VALORANT",
    description: "Torneio eliminatório em formato melhor de 3, com final presencial transmitida ao vivo.",
    prize: 15000,
    maxTeams: 16,
    startDate: new Date("2027-03-20T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Liga Serrana de Counter-Strike 2",
    game: "CS2",
    description: "Pontos corridos com 8 rodadas e playoffs entre os quatro melhores times.",
    prize: 10000,
    maxTeams: 32,
    startDate: new Date("2027-04-10T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Challenger League of Legends",
    game: "League of Legends",
    description: "Campeonato para equipes amadoras, com fase de grupos e mata-mata.",
    prize: 20000,
    maxTeams: 16,
    startDate: new Date("2027-04-24T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Torneio Masters de Rocket League",
    game: "Rocket League",
    description: "Disputa 3x3 em dupla eliminação, aberta a times de todo o país.",
    prize: 5000,
    maxTeams: 64,
    startDate: new Date("2027-05-08T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1511882150382-421056c89033?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Open Cup Rainbow Six Siege",
    game: "Rainbow Six Siege",
    description: "Copa aberta com chaveamento por sorteio e finais em melhor de 5.",
    prize: 8000,
    maxTeams: 16,
    startDate: new Date("2027-05-22T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Circuitinho de Dota 2",
    game: "Dota 2",
    description: "Circuito de três etapas com pontuação acumulada e grande final.",
    prize: 6000,
    maxTeams: 8,
    startDate: new Date("2027-06-12T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Copa Apex Legends Arena",
    game: "Apex Legends",
    description: "Partidas em trios com pontuação por abates e posição final.",
    prize: 4000,
    maxTeams: 20,
    startDate: new Date("2027-06-26T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Showdown Overwatch 2",
    game: "Overwatch 2",
    description: "Torneio 5x5 em dupla eliminação, com transmissão de todas as partidas.",
    prize: 7500,
    maxTeams: 16,
    startDate: new Date("2027-07-10T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Copa Relâmpago de CS2",
    game: "CS2",
    description: "Torneio de um dia só, com partidas rápidas e premiação para os três primeiros.",
    prize: 3000,
    maxTeams: 16,
    startDate: new Date("2027-08-07T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop",
  },
  {
    name: "Liga Universitária VALORANT",
    game: "VALORANT",
    description: "Campeonato exclusivo para equipes formadas por estudantes universitários.",
    prize: 9000,
    maxTeams: 24,
    startDate: new Date("2027-09-04T15:00:00Z"),
    imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop",
  },
];

async function main() {
  for (const c of campeonatos) {
    await prisma.tournament.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
  }
  console.log(`✔ ${campeonatos.length} campeonatos cadastrados/atualizados.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
