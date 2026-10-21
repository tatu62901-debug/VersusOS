import { JOGOS } from '@/lib/regras';

// Estado devolvido pelas Server Actions para os formulários
export type EstadoForm = {
  erro?: string;
  sucesso?: string;
  valores?: Record<string, string>; // devolve o que a pessoa digitou, pra não limpar o form
};

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}

export function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === 'string' ? valor.trim() : '';
}

export function valoresDe(formData: FormData, campos: string[]) {
  const valores: Record<string, string> = {};
  for (const campo of campos) valores[campo] = texto(formData, campo);
  return valores;
}

export function validarTime(formData: FormData): Resultado<{
  name: string;
  game: string;
  description: string | null;
}> {
  const name = texto(formData, 'name');
  const game = texto(formData, 'game');
  const description = texto(formData, 'description');

  if (!name) return falha('Informe o nome do time.');
  if (name.length < 3 || name.length > 30) {
    return falha('O nome do time deve ter entre 3 e 30 caracteres.');
  }
  if (!game) return falha('Escolha o jogo do time.');
  if (!(JOGOS as readonly string[]).includes(game)) {
    return falha('Jogo inválido. Escolha uma das opções da lista.');
  }
  if (description.length > 200) {
    return falha('A descrição pode ter no máximo 200 caracteres.');
  }

  return { ok: true, dados: { name, game, description: description || null } };
}

export function validarJogador(formData: FormData): Resultado<{
  nickname: string;
  role: string;
  age: number;
}> {
  const nickname = texto(formData, 'nickname');
  const role = texto(formData, 'role');
  const idadeTexto = texto(formData, 'age');

  if (!nickname) return falha('Informe o nickname do jogador.');
  if (nickname.length < 2 || nickname.length > 20) {
    return falha('O nickname deve ter entre 2 e 20 caracteres.');
  }
  if (!role) return falha('Informe a função do jogador (ex: Capitão, Suporte).');
  if (role.length < 2 || role.length > 30) {
    return falha('A função deve ter entre 2 e 30 caracteres.');
  }
  if (!idadeTexto) return falha('Informe a idade do jogador.');

  const age = Number(idadeTexto);
  if (!Number.isInteger(age) || age < 10 || age > 70) {
    return falha('A idade deve ser um número inteiro entre 10 e 70.');
  }

  return { ok: true, dados: { nickname, role, age } };
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarPerfil(formData: FormData): Resultado<{ name: string; email: string }> {
  const name = texto(formData, 'name');
  const email = texto(formData, 'email').toLowerCase();

  if (!name) return falha('Informe o seu nome.');
  if (name.length < 2 || name.length > 60) {
    return falha('O nome deve ter entre 2 e 60 caracteres.');
  }
  if (!email) return falha('Informe o seu e-mail.');
  if (email.length > 254 || !EMAIL_VALIDO.test(email)) {
    return falha('Informe um e-mail válido.');
  }

  return { ok: true, dados: { name, email } };
}

export function validarNovaSenha(
  senhaAtual: string,
  senhaNova: string,
  confirmacao: string
): { ok: true } | { ok: false; erro: string } {
  if (!senhaAtual) return falha('Informe a sua senha atual.');
  if (!senhaNova) return falha('Informe a nova senha.');
  if (senhaNova.length < 6) return falha('A nova senha deve ter pelo menos 6 caracteres.');
  if (senhaNova.length > 72) return falha('A nova senha pode ter no máximo 72 caracteres.');
  if (senhaNova === senhaAtual) return falha('A nova senha precisa ser diferente da atual.');
  if (senhaNova !== confirmacao) return falha('A confirmação não é igual à nova senha.');
  return { ok: true };
}
