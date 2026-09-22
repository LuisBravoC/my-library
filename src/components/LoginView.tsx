import { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { signInWithPassword } from '../lib/supabase';

interface Props {
  session: Session | null;
  onDone: () => void;
  onBack: () => void;
}

/** Página de acceso del dueño: email + contraseña, nada más. */
export default function LoginView({ session, onDone, onBack }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');

  return (
    <section className="mx-auto w-full max-w-md space-y-4 rounded-2xl bg-black/20 p-6 text-center ring-1 ring-white/10 sm:p-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl th-logo">
        <KeyRound size={22} />
      </span>
      {session ? (
        <>
          <h2 className="text-xl font-bold text-white">Sesión iniciada</h2>
          <p className="text-sm text-[#8f98a0]">{session.user.email}</p>
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-lg th-btn px-4 py-2.5 text-sm font-semibold transition hover:brightness-110"
          >
            Ir a mis listas
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold text-white">Acceso del dueño</h2>
          <p className="text-sm text-[#8f98a0]">Solo el dueño puede crear o editar listas.</p>
          <form
            className="space-y-2 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim() || !password) return;
              setStatus('sending');
              signInWithPassword(email.trim(), password)
                .then(() => setStatus('idle'))
                .catch(() => setStatus('error'));
            }}
          >
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="w-full rounded-lg bg-[#0e141b] px-3 py-2.5 text-sm text-white placeholder:text-[#8f98a0]/70 ring-1 ring-white/10 focus:outline-none th-focus"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              className="w-full rounded-lg bg-[#0e141b] px-3 py-2.5 text-sm text-white placeholder:text-[#8f98a0]/70 ring-1 ring-white/10 focus:outline-none th-focus"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-lg th-btn px-4 py-2.5 text-sm font-semibold transition hover:brightness-110 disabled:opacity-50"
            >
              {status === 'sending' ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          {status === 'error' && (
            <p className="text-sm text-red-300">Credenciales inválidas. Revisa email y contraseña.</p>
          )}
        </>
      )}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-[#8f98a0] transition hover:text-white"
      >
        <ArrowLeft size={13} /> Volver a la biblioteca
      </button>
    </section>
  );
}
