import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validação de campos obrigatórios
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos os campos (nome, e-mail e senha) são obrigatórios.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    // Verificar se e-mail já existe
    const usuarioExistente = await prisma.user.findUnique({
      where: { email: emailNormalizado },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { error: 'Este e-mail já está em uso por outra conta.' },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário + conta (a senha fica no model Account, não no User)
    const novoUsuario = await prisma.user.create({
      data: {
        name,
        email: emailNormalizado,
        accounts: {
          create: {
            id: crypto.randomUUID(),
            accountId: crypto.randomUUID(),
            providerId: 'credential',
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: 'Conta criada com sucesso!', user: novoUsuario },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao cadastrar usuário:', error);
    return NextResponse.json(
      { error: error?.message || 'Ocorreu um erro interno ao criar a conta.' },
      { status: 500 }
    );
  }
}
