import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Email con permiso de escritura (dueño). */
export const OWNER_EMAIL = (import.meta.env.VITE_OWNER_EMAIL as string | undefined)?.toLowerCase() ?? '';

/** ¿Hay backend configurado? Sin env, la sección de listas queda desactivada. */
export const SUPABASE_CONFIGURED = Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient> | null = null;

/** Cliente perezoso con import dinámico: Supabase no entra en el bundle inicial.
 * Devuelve null si faltan las env vars. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!SUPABASE_CONFIGURED) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url as string, anonKey as string),
    );
  }
  return clientPromise;
}

/** Acceso con email + contraseña (único método; sin OTP por los rate limits). */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const sb = await getSupabase();
  await sb?.auth.signOut();
}
