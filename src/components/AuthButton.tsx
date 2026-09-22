import { LogIn, LogOut, User } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { SUPABASE_CONFIGURED, signOut } from '../lib/supabase';

interface Props {
  session: Session | null;
  checking: boolean;
  isOwner: boolean;
  onLogin: () => void;
}

/** Entrar lleva a /login; con sesión muestra chip + salir. */
export default function AuthButton({ session, checking, isOwner, onLogin }: Props) {
  if (!SUPABASE_CONFIGURED) return null;
  if (checking) return <span className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />;

  if (session) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          title={session.user.email}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ring-1 ${
            isOwner
              ? 'bg-[#66c0f4]/15 font-semibold text-[#66c0f4] ring-[#66c0f4]/30'
              : 'bg-white/5 text-[#8f98a0] ring-white/10'
          }`}
        >
          <User size={13} />
          <span className="hidden max-w-28 truncate sm:inline">{session.user.email}</span>
          {isOwner && <span className="hidden sm:inline">· dueño</span>}
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="rounded-lg bg-white/5 p-2 text-[#8f98a0] ring-1 ring-white/10 transition hover:text-white"
        >
          <LogOut size={15} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onLogin}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-[#c7d5e0] ring-1 ring-white/10 transition hover:text-white hover:ring-[#66c0f4]/50"
    >
      <LogIn size={14} /> Entrar
    </button>
  );
}
