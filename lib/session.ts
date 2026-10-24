import { cookies } from 'next/headers';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'versusos_session';
const SESSION_DAYS = 7;

// O token "cru" fica só no cookie do navegador.
// No banco guardamos apenas o hash dele (se o banco vazar, ninguém usa as sessões).
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, meta?: { ipAddress?: string | null; userAgent?: string | null }) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const agora = new Date();

  await prisma.session.create({
    data: {
      id: randomUUID(),
      token: hashToken(token),
      userId,
      expiresAt,
      createdAt: agora,
      updatedAt: agora,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

// Retorna o usuário logado ou null. Use SEMPRE no servidor pra checar permissões.
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessao = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, bannedAt: true } } },
  });

  if (!sessao) return null;

  if (sessao.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sessao.id } }).catch(() => {});
    return null;
  }

  // Conta suspensa por um administrador: não é considerada logada
  if (sessao.user.bannedAt) return null;

  return { id: sessao.user.id, name: sessao.user.name, email: sessao.user.email };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token: hashToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE);
}

// Encerra todas as sessões do usuário, exceto a atual (usado ao trocar a senha).
export async function encerrarOutrasSessoes(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  await prisma.session.deleteMany({
    where: {
      userId,
      ...(token ? { NOT: { token: hashToken(token) } } : {}),
    },
  });
}
