import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    projeto: 'VersusOS',
    versao: '1.0.0',
    descricao: 'Plataforma de Gerenciamento de Torneios de E-sports',
    status: 'online'
  });
}