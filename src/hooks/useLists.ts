import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { OWNER_EMAIL, SUPABASE_CONFIGURED, getSupabase } from '../lib/supabase';
import type { List, ListItem } from '../types/lists';

// Sesión como store externo: sin setState en efectos (lint limpio).
// session undefined = aún sin cargar; failed = rendirse y seguir como logged-out.
interface AuthSnap {
  session: Session | null | undefined;
  failed: boolean;
}

let authSnap: AuthSnap = { session: undefined, failed: false };
const SESSION_TIMEOUT_MS = 5000;

function subscribeSession(callback: () => void): () => void {
  let unsub = () => {};
  let cancelled = false;
  const timer = window.setTimeout(() => {
    if (!cancelled && authSnap.session === undefined && !authSnap.failed) {
      console.warn('[auth] session check timed out, continuing as logged out');
      authSnap = { session: authSnap.session, failed: true };
      callback();
    }
  }, SESSION_TIMEOUT_MS);
  const finish = () => {
    if (!cancelled) window.clearTimeout(timer);
  };
  void getSupabase()
    .then((sb) => {
      if (cancelled || !sb) {
        if (!sb) {
          authSnap = { session: null, failed: false };
          callback();
        }
        finish();
        return;
      }
      sb.auth
        .getSession()
        .then(({ data }) => {
          if (cancelled) return;
          authSnap = { session: data.session, failed: false };
          callback();
          finish();
        })
        .catch(() => {
          if (cancelled) return;
          authSnap = { session: authSnap.session, failed: true };
          callback();
          finish();
        });
      const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
        authSnap = { session: s, failed: false };
        callback();
      });
      unsub = () => sub.subscription.unsubscribe();
    })
    .catch(() => {
      if (cancelled) return;
      authSnap = { session: authSnap.session, failed: true };
      callback();
      finish();
    });
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    unsub();
  };
}

export function useSession() {
  useSyncExternalStore(subscribeSession, () => authSnap, () => authSnap);
  const checking = SUPABASE_CONFIGURED && authSnap.session === undefined && !authSnap.failed;
  const session = authSnap.session ?? null;
  const isOwner =
    !!session?.user?.email && session.user.email.toLowerCase() === OWNER_EMAIL && OWNER_EMAIL !== '';

  return { session, checking, isOwner };
}

export interface ListsState {
  lists: List[];
  items: Record<string, ListItem[]>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createList: (title: string, description: string, slug: string) => Promise<void>;
  updateList: (id: string, patch: { title?: string; description?: string; notesStyle?: 'sutil' | 'destacado' }) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addGame: (listId: string, game: { store: 'steam' | 'gog'; id: number; title: string }, note?: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

export function useLists(enabled: boolean): ListsState {
  const [lists, setLists] = useState<List[]>([]);
  const [items, setItems] = useState<Record<string, ListItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Resets durante el render (sin setState síncrono en el efecto).
  const [prevKey, setPrevKey] = useState('off');
  const fetchKey = enabled ? `on-${nonce}` : 'off';
  if (fetchKey !== prevKey) {
    setPrevKey(fetchKey);
    setLoading(fetchKey !== 'off');
    setError(null);
  }

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const sb = await getSupabase();
      if (!sb || cancelled) return;
      const { data: lrows, error: lerr } = await sb
        .from('msl_lists')
        .select('id,title,slug,description,notes_style')
        .order('created_at', { ascending: true });
      if (lerr) throw lerr;
      const { data: irows, error: ierr } = await sb
        .from('msl_list_items')
        .select('id,list_id,store,game_id,title,note,position')
        .order('position', { ascending: true });
      if (ierr) throw ierr;
      if (cancelled) return;
      setLists(
        (lrows ?? []).map(
          (r: { id: string; title: string; slug: string; description: string; notes_style?: string }) => ({
            id: r.id,
            title: r.title,
            slug: r.slug ?? '',
            description: r.description ?? '',
            notesStyle: r.notes_style === 'destacado' ? 'destacado' : 'sutil',
          }),
        ),
      );
      const grouped: Record<string, ListItem[]> = {};
      for (const r of irows ?? []) {
        const it: ListItem = {
          id: r.id as string,
          listId: r.list_id as string,
          store: r.store as 'steam' | 'gog',
          gameId: (r.game_id as number) ?? 0,
          title: (r.title as string) ?? '',
          note: (r.note as string) ?? '',
          position: (r.position as number) ?? 0,
        };
        (grouped[it.listId] ??= []).push(it);
      }
      setItems(grouped);
      setLoading(false);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : 'Error cargando listas');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, nonce]);

  const mutate = useCallback(
    async (fn: () => Promise<{ error: unknown } | void>) => {
      const r = await fn();
      const err = (r as { error?: { message?: string } } | undefined)?.error;
      if (err) throw new Error(err.message || 'Error guardando');
      refresh();
    },
    [refresh],
  );

  const createList = useCallback(
    (title: string, description: string, slug: string) =>
      mutate(async () => {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase no configurado');
        return sb.from('msl_lists').insert({ title, description, slug });
      }),
    [mutate],
  );

  const updateList = useCallback(
    (id: string, patch: { title?: string; description?: string; notesStyle?: 'sutil' | 'destacado' }) =>
      mutate(async () => {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase no configurado');
        const row: Record<string, string> = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.notesStyle !== undefined) row.notes_style = patch.notesStyle;
        return sb.from('msl_lists').update(row).eq('id', id);
      }),
    [mutate],
  );

  const deleteList = useCallback(
    (id: string) =>
      mutate(async () => {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase no configurado');
        return sb.from('msl_lists').delete().eq('id', id);
      }),
    [mutate],
  );

  const addGame = useCallback(
    (listId: string, game: { store: 'steam' | 'gog'; id: number; title: string }, note = '') =>
      mutate(async () => {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase no configurado');
        const { data: existing } = await sb
          .from('msl_list_items')
          .select('position')
          .eq('list_id', listId)
          .order('position', { ascending: false })
          .limit(1);
        const pos = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;
        return sb.from('msl_list_items').insert({
          list_id: listId,
          store: game.store,
          game_id: game.id,
          title: game.title,
          note,
          position: pos,
        });
      }),
    [mutate],
  );

  const removeItem = useCallback(
    (itemId: string) =>
      mutate(async () => {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase no configurado');
        return sb.from('msl_list_items').delete().eq('id', itemId);
      }),
    [mutate],
  );

  return { lists, items, loading, error, refresh, createList, updateList, deleteList, addGame, removeItem };
}
