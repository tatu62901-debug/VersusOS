import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/session';
import {
  JANELA_LOGIN_MINUTOS,
  MAX_TENTATIVAS_LOGIN_EMAIL,
  MAX_TENTATIVAS_LOGIN_IP,
} from '@/lib/regras';

// Hash de mentira, usado pra gastar o mesmo tempo quando o e-mail não existe
const HASH_FALSO = bcrypt.hashSync('senha-falsa-para-comparacao', 10);

function descobrirIp(request: Request) {
  const encaminhado = request.headers.get('x-forwarded-for');
  if (encaminhado) return encaminhado.split(',')[0].trim() || null;
  return request.headers.get('x-real-ip');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Informe o e-mail e a senha.' }, { status: 400 });
    }

    const ip = descobrirIp(request);
    const janelaMs = JANELA_LOGIN_MINUTOS * 60 * 1000;
    const desde = new Date(Date.now() - janelaMs);

    // ---- Limite de tentativas: conta as FALHAS recentes deste e-mail e deste IP ----
    const [falhasEmail, falhasIp] = await Promise.all([
      prisma.loginAttempt.count({ where: { email, createdAt: { gt: desde } } }),
      ip ? prisma.loginAttempt.count({ where: { ip, createdAt: { gt: desde } } }) : Promise.resolve(0),
    ]);

    if (falhasEmail >= MAX_TENTATIVAS_LOGIN_EMAIL || falhasIp >= MAX_TENTATIVAS_LOGIN_IP) {
      const maisAntiga = await prisma.loginAttempt.findFirst({
        where: falhasEmail >= MAX_TENTATIVAS_LOGIN_EMAIL ? { email, createdAt: { gt: desde } } : { ip, createdAt: { gt: desde } },
        orderBy: { createdAt: 'asc' },
      });
      const liberaEm = maisAntiga ? maisAntiga.createdAt.getTime() + janelaMs : Date.now() + janelaMs;
      const minutos = Math.max(1, Math.ceil((liberaEm - Date.now()) / 60000));

      return NextResponse.json(
        { error: `Muitas tentativas de login. Tente novamente em ${minutos} minuto(s).` },
        { status: 429, headers: { 'Retry-After': String(minutos * 60) } }
      );
    }

    const usuario = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: { where: { providerId: 'credential' }, take: 1 },
      },
    });

    const hash = usuario?.accounts[0]?.password;
    const senhaCorreta = await bcrypt.compare(password, hash ?? HASH_FALSO);

    if (!usuario || !hash || !senhaCorreta) {
      // Registra a falha (também para e-mails que não existem, pra não revelar quais existem)
      await prisma.loginAttempt.create({ data: { email, ip } });
      // Limpeza: apaga tentativas antigas que já não contam mais
      await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: desde } } });

      // Mensagem genérica de propósito: não revela se o e-mail existe
      return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    // Login certo: zera as falhas deste e-mail
    await prisma.loginAttempt.deleteMany({ where: { email } });

    // Conta suspensa por um administrador (só revelamos depois de a senha estar certa)
    if (usuario.bannedAt) {
      return NextResponse.json(
        {
          error: `Esta conta foi suspensa pela administração.${usuario.banReason ? ` Motivo: ${usuario.banReason}` : ''}`,
        },
        { status: 403 }
      );
    }

    await createSession(usuario.id, {
      ipAddress: ip,
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      message: 'Login realizado com sucesso!',
      user: { id: usuario.id, name: usuario.name, email: usuario.email },
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return NextResponse.json({ error: 'Ocorreu um erro interno ao fazer login.' }, { status: 500 });
  }
}
