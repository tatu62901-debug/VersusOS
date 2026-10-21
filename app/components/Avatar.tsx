type Props = {
  src?: string | null;
  nome: string;
  tamanho?: 'sm' | 'md' | 'lg';
  className?: string;
};

const TAMANHOS = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-xl',
  lg: 'w-20 h-20 text-3xl',
};

// Mostra a imagem (logo/foto) ou, se não houver, um círculo com a inicial do nome
export default function Avatar({ src, nome, tamanho = 'md', className = '' }: Props) {
  const base = `${TAMANHOS[tamanho]} shrink-0 rounded-full overflow-hidden ${className}`;

  if (src) {
    return <img src={src} alt={nome} className={`${base} object-cover bg-slate-800`} />;
  }

  return (
    <div className={`${base} bg-indigo-600/80 flex items-center justify-center font-bold text-white`}>
      {nome.trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}
