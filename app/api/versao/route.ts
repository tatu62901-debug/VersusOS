import { NextResponse } from 'next/server';

// Lê a variável na hora de cada pedido (não deixa a resposta "congelada" no build)
export const dynamic = 'force-dynamic';

// Prova de que o site no ar é deste repositório: a Vercel preenche estas variáveis
// automaticamente com os dados do commit que gerou o deploy.
export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  return NextResponse.json({
    projeto: 'VersusOS',
    versao: '1.0.0',
    descricao: 'Plataforma de Gerenciamento de Torneios de E-sports',
    status: 'online',
    commit, // código completo do último commit (o mesmo que aparece no GitHub)
    commitCurto: commit ? commit.slice(0, 7) : null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    ambiente: process.env.VERCEL_ENV ?? 'local',
    ...(commit ? {} : { aviso: 'Sem código de commit: o site está rodando fora da Vercel (ambiente local).' }),
  });
}
