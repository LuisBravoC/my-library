import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { sendMagicLink } from '../lib/supabase';

interface Props {
  session: Session | null;
  onDone: () => void;
  onBack: () => void;
}

/** Página de acceso del dueño: email + enlace mágico, nada más. */
export default function LoginView({ session, onDone, onBack }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'limited' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

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
          <p className="text-sm text-[#8f98a0]">
            Escribe tu correo y te enviamos un enlace para entrar. Solo el dueño puede crear o editar listas.
          </p>
          <form
            className="space-y-2 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim() || cooldown > 0) return;
              setStatus('sending');
              sendMagicLink(email.trim())
                .then(() => {
                  setStatus('sent');
                  setCooldown(60);
                })
                .catch((err: unknown) => {
                  const code = (err as { status?: number })?.status;
                  setStatus(code === 429 ? 'limited' : 'error');
                  if (code === 429) setCooldown(60);
                });
            }}
          >
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-lg bg-[#0e141b] px-3 py-2.5 text-sm text-white placeholder:text-[#8f98a0]/70 ring-1 ring-white/10 focus:outline-none th-focus"
            />
            <button
              type="submit"
              disabled={status === 'sending' || cooldown > 0}
              className="w-full rounded-lg th-btn px-4 py-2.5 text-sm font-semibold transition hover:brightness-110 disabled:opacity-50"
            >
              {status === 'sending'
                ? 'Enviando…'
                : cooldown > 0
                  ? `Espera ${cooldown}s para reenviar`
                  : 'Enviar enlace'}
            </button>
          </form>
          {status === 'sent' && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-emerald-300">
              <MailCheck size={15} /> Revisa tu correo para entrar.
            </p>
          )}
          {status === 'error' && <p className="text-sm text-red-300">No se pudo enviar. Prueba de nuevo.</p>}
          {status === 'limited' && (
            <p className="text-sm text-yellow-300">
              Demasiados intentos seguidos: Supabase limita los envíos. Espera unos minutos y prueba de nuevo.
            </p>
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
