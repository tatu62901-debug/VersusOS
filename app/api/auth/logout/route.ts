import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ message: 'Logout realizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro interno ao sair.' },
      { status: 500 }
    );
  }
}
