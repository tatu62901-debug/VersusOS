import { put, del } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { IMAGEM_MAX_BYTES, IMAGEM_MAX_MB } from '@/lib/regras';

export type ImagemValida = {
  arquivo: File;
  tipo: string; // image/jpeg, image/png ou image/webp
  extensao: string; // jpg, png ou webp
};

export type LeituraImagem =
  | { ok: true; imagem: ImagemValida | null; remover: boolean }
  | { ok: false; erro: string };

function ascii(bytes: Uint8Array, inicio: number, fim: number) {
  return String.fromCharCode(...bytes.slice(inicio, fim));
}

// Descobre o tipo REAL da imagem olhando os primeiros bytes do arquivo,
// em vez de confiar no tipo que o navegador informa (que pode ser falso).
function detectarTipo(bytes: Uint8Array): { tipo: string; extensao: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { tipo: 'image/jpeg', extensao: 'jpg' };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { tipo: 'image/png', extensao: 'png' };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return { tipo: 'image/webp', extensao: 'webp' };
  }
  return null;
}

// Lê e VALIDA (tipo e tamanho) a imagem enviada no formulário. Ainda não envia pro Blob.
export async function lerImagem(formData: FormData, campo = 'imagem'): Promise<LeituraImagem> {
  const remover = formData.get('removerImagem') === 'on';
  const valor = formData.get(campo);

  // Nenhum arquivo escolhido
  if (!(valor instanceof File) || valor.size === 0) {
    return { ok: true, imagem: null, remover };
  }

  if (valor.size > IMAGEM_MAX_BYTES) {
    return { ok: false, erro: `A imagem é grande demais. O tamanho máximo é ${IMAGEM_MAX_MB} MB.` };
  }

  const bytes = new Uint8Array(await valor.arrayBuffer());
  const detectado = detectarTipo(bytes);
  if (!detectado) {
    return { ok: false, erro: 'Formato de imagem inválido. Envie um arquivo JPG, PNG ou WebP.' };
  }

  return { ok: true, imagem: { arquivo: valor, ...detectado }, remover };
}

// Envia a imagem para o Vercel Blob e devolve a URL pública.
export async function enviarImagem(imagem: ImagemValida, pasta: 'times' | 'jogadores') {
  const caminho = `${pasta}/${randomUUID()}.${imagem.extensao}`;
  const blob = await put(caminho, imagem.arquivo, {
    access: 'public',
    contentType: imagem.tipo,
    addRandomSuffix: false,
  });
  return blob.url;
}

// Apaga uma imagem do Blob. Só mexe em URLs do próprio Vercel Blob e nunca derruba a ação se falhar.
export async function apagarImagem(url: string | null | undefined) {
  if (!url) return;
  try {
    const host = new URL(url).hostname;
    if (!host.endsWith('.blob.vercel-storage.com')) return;
    await del(url);
  } catch (error) {
    console.warn('Não foi possível apagar a imagem antiga:', error);
  }
}
