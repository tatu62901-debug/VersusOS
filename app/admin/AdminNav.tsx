'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ABAS = [
  { href: '/admin', rotulo: 'Resumo' },
  { href: '/admin/campeonatos', rotulo: 'Campeonatos' },
  { href: '/admin/times', rotulo: 'Times' },
  { href: '/admin/usuarios', rotulo: 'Usuários' },
  { href: '/admin/log', rotulo: 'Histórico' },
];

export default function AdminNav() {
  const caminho = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Menu de administração">
      {ABAS.map((aba) => {
        const ativa = aba.href === '/admin' ? caminho === '/admin' : caminho.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={`shrink-0 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              ativa
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
