'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  const handleLogout = async () => {
    setSaindo(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={saindo}
      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-100 text-sm rounded-lg border border-slate-700 transition-colors"
    >
      {saindo ? 'Saindo...' : 'Sair'}
    </button>
  );
}
