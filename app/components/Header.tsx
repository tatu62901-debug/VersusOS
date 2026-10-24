import Link from 'next/link';
import LogoutButton from '@/app/painel/LogoutButton';
import { ehAdmin } from '@/lib/admin';

type Props = {
  user: { id: string; name: string; email?: string } | null;
};

export default function Header({ user }: Props) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black text-indigo-500 tracking-wider">VERSUS</span>
          <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono border border-indigo-500/20">
            OS
          </span>
        </Link>

        {user ? (
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className="hidden lg:inline text-sm text-slate-400 mr-2">
              Olá, <span className="text-slate-200 font-medium">{user.name}</span>
            </span>
            <Link
              href="/equipes"
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Times
            </Link>
            <Link
              href="/times"
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Meus times
            </Link>
            <Link
              href="/painel"
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Painel
            </Link>
            {ehAdmin(user.email) && (
              <Link
                href="/admin"
                className="px-3 py-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
              >
                Admin
              </Link>
            )}
            <LogoutButton />
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <Link
              href="/equipes"
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Times
            </Link>
            <Link
              href="/login"
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
            >
              Criar Conta
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
