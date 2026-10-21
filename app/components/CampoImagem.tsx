'use client';

import { useEffect, useRef, useState } from 'react';
import { IMAGEM_MAX_BYTES, IMAGEM_MAX_MB } from '@/lib/regras';
import { ui } from '@/lib/ui';

type Props = {
  rotulo: string;
  urlAtual?: string | null; // imagem que já existe (na edição)
};

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

// Campo de upload com pré-visualização e aviso imediato de arquivo inválido.
// A validação de verdade (tipo e tamanho) é refeita no SERVIDOR.
export default function CampoImagem({ rotulo, urlAtual }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  // Quando o formulário é limpo pelo React (após enviar), limpa a pré-visualização também
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const limpar = () => {
      setPreview(null);
      setAviso('');
    };
    form.addEventListener('reset', limpar);
    return () => form.removeEventListener('reset', limpar);
  }, []);

  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    setAviso('');
    setPreview(null);
    if (!arquivo) return;

    if (!TIPOS_ACEITOS.includes(arquivo.type)) {
      setAviso('Formato inválido. Envie um arquivo JPG, PNG ou WebP.');
      e.target.value = '';
      return;
    }
    if (arquivo.size > IMAGEM_MAX_BYTES) {
      setAviso(`A imagem é grande demais. O tamanho máximo é ${IMAGEM_MAX_MB} MB.`);
      e.target.value = '';
      return;
    }
    setPreview(URL.createObjectURL(arquivo));
  }

  const imagemMostrada = preview ?? urlAtual ?? null;

  return (
    <div>
      <label htmlFor="imagem" className={ui.label}>{rotulo}</label>

      <div className="flex items-center gap-4">
        {imagemMostrada ? (
          <img
            src={imagemMostrada}
            alt="Pré-visualização"
            className="w-16 h-16 shrink-0 rounded-full object-cover bg-slate-800 border border-slate-700"
          />
        ) : (
          <div className="w-16 h-16 shrink-0 rounded-full bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-600">
            sem foto
          </div>
        )}

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id="imagem"
            name="imagem"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={aoEscolher}
            className="block w-full text-xs text-slate-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 file:text-xs hover:file:bg-slate-700"
          />
          <p className="text-[11px] text-slate-500 mt-1">JPG, PNG ou WebP, até {IMAGEM_MAX_MB} MB.</p>
        </div>
      </div>

      {aviso && <p className="text-xs text-red-400 mt-2">{aviso}</p>}

      {urlAtual && !preview && (
        <label className="flex items-center gap-2 mt-3 text-xs text-slate-400">
          <input type="checkbox" name="removerImagem" className="accent-indigo-500" />
          Remover a imagem atual
        </label>
      )}
    </div>
  );
}
