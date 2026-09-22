import { useState } from 'react';
import { Link2, ListOrdered, Pencil, Pin, Plus, Trash2, X } from 'lucide-react';
import GameCard from './GameCard';
import { makeSlug, routeHref } from '../lib/store-route';
import type { Game } from '../types/game';
import type { ListsState } from '../hooks/useLists';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

interface Props {
  gameByKey: Map<string, Game>;
  lists: ListsState;
  isOwner: boolean;
  onSelectGame: (g: Game) => void;
  /** Slug de la URL para preseleccionar (/lista/:slug). */
  sharedSlug: string | null;
  /** La app actualiza la URL al elegir lista (deep link compartible). */
  onShareUrl: (slug: string | null) => void;
}

/** Vista pública de listas + editor solo para el dueño. */
export default function ListsView({ gameByKey, lists, isOwner, onSelectGame, sharedSlug, onShareUrl }: Props) {
  const { lists: all, items, loading, error } = lists;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Deep link /lista/:slug → preseleccionar al cargar o navegar (sin efectos).
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [prevSlugKey, setPrevSlugKey] = useState('');
  const [styleOverride, setStyleOverride] = useState<'sutil' | 'destacado' | null>(null);
  const wantSlug = pendingSlug ?? sharedSlug;
  const slugKey = `${wantSlug ?? ''}|${all.map((l) => l.id).join(',')}`;
  if (slugKey !== prevSlugKey) {
    setPrevSlugKey(slugKey);
    const found = wantSlug ? all.find((l) => l.slug === wantSlug) : undefined;
    if (found) {
      setActiveId(found.id);
      setPendingSlug(null);
    }
  }

  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="rounded-xl bg-[#1b2838]/60 p-10 text-center ring-1 ring-white/10">
        <ListOrdered size={32} className="mx-auto text-[#8f98a0]" />
        <p className="mt-3 font-semibold text-white">Listas no configuradas</p>
        <p className="mt-1 text-sm text-[#8f98a0]">
          Faltan las variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    );
  }

  const active = all.find((l) => l.id === (activeId ?? all[0]?.id)) ?? null;
  const activeItems = active ? (items[active.id] ?? []) : [];
  // Si algún juego tiene nota, se reserva el hueco en todas las tarjetas
  // para que la retícula quede uniforme.
  const hasNotes = activeItems.some((it) => it.note.trim() !== '');
  // Vista efectiva: el dueño fija el default en BD; cualquiera puede
  // cambiarlo localmente sin persistir (override efímero por lista).
  const destacado = (styleOverride ?? active?.notesStyle ?? 'sutil') === 'destacado';

  const submitCreate = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const slug = makeSlug(title.trim(), new Set(all.map((l) => l.slug)));
      await lists.createList(title.trim(), description.trim(), slug);
      setTitle('');
      setDescription('');
      setCreating(false);
      setPendingSlug(slug);
      onShareUrl(slug);
    } finally {
      setBusy(false);
    }
  };

  const submitRename = async () => {
    if (!active || !title.trim() || busy) return;
    setBusy(true);
    try {
      await lists.updateList(active.id, { title: title.trim(), description: description.trim() });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {all.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setActiveId(l.id);
              setStyleOverride(null);
              onShareUrl(l.slug);
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ring-1 transition ${
              active?.id === l.id
                ? 'th-pill-active font-semibold ring-transparent'
                : 'bg-white/5 text-[#c7d5e0] ring-white/10 th-ring-hover'
            }`}
          >
            {l.title}{' '}
            <span className="opacity-60">{(items[l.id] ?? []).length}</span>
          </button>
        ))}
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setCreating((v) => !v);
              setEditing(false);
              setTitle('');
              setDescription('');
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full th-soft th-soft-btn px-3 py-1 text-xs font-semibold transition"
          >
            <Plus size={13} /> Nueva lista
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-[#8f98a0]">Cargando listas…</p>}
      {error && !loading && (
        <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-300 ring-1 ring-red-400/30">{error}</div>
      )}

      {isOwner && creating && (
        <div className="space-y-2 rounded-xl bg-black/20 p-4 ring-1 ring-white/10">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la lista"
            className="w-full rounded-lg bg-[#0e141b] px-3 py-2 text-sm text-white placeholder:text-[#8f98a0]/70 ring-1 ring-white/10 focus:outline-none th-focus"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full rounded-lg bg-[#0e141b] px-3 py-2 text-sm text-white placeholder:text-[#8f98a0]/70 ring-1 ring-white/10 focus:outline-none th-focus"
          />
          <button
            type="button"
            onClick={() => void submitCreate()}
            disabled={busy || !title.trim()}
            className="rounded-lg th-btn px-4 py-2 text-sm font-semibold transition hover:brightness-110 disabled:opacity-50"
          >
            Crear lista
          </button>
        </div>
      )}

      {!loading && !error && !active && (
        <div className="rounded-xl bg-[#1b2838]/60 p-10 text-center ring-1 ring-white/10">
          <ListOrdered size={32} className="mx-auto text-[#8f98a0]" />
          <p className="mt-3 font-semibold text-white">Aún no hay listas</p>
          {isOwner && <p className="mt-1 text-sm text-[#8f98a0]">Crea la primera con “Nueva lista”.</p>}
        </div>
      )}

      {active && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">{active.title}</h2>
              {active.description && <p className="text-sm text-[#8f98a0]">{active.description}</p>}
              <button
                type="button"
                onClick={() => {
                  const url = routeHref({ kind: 'list', slug: active.slug }, window.location.href);
                  const done = () => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  };
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url).then(done).catch(done);
                  } else {
                    window.prompt('Copia el enlace:', url);
                  }
                }}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-[#66c0f4]/80 transition hover:text-[#66c0f4]"
              >
                <Link2 size={12} /> {copied ? '¡Copiado!' : 'Compartir lista'}
              </button>
            </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <div
                  className="flex rounded-lg bg-black/20 p-0.5 ring-1 ring-white/10"
                  role="group"
                  aria-label="Estilo de notas"
                  title="Cómo se muestran los comentarios"
                >
                  {(
                    [
                      { value: 'sutil', label: 'Sutiles' },
                      { value: 'destacado', label: 'Destacadas' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setStyleOverride((cur) => (cur === m.value ? null : m.value))}
                      aria-pressed={destacado === (m.value === 'destacado')}
                      title={isOwner ? 'Vista local (fijar con la chincheta)' : 'Vista local'}
                      className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                        destacado === (m.value === 'destacado')
                          ? 'bg-[#66c0f4]/20 font-semibold text-[#66c0f4]'
                          : 'text-[#8f98a0] hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                {isOwner && styleOverride && styleOverride !== (active.notesStyle ?? 'sutil') && (
                  <button
                    type="button"
                    title="Guardar como vista por defecto de la lista"
                    aria-label="Guardar como vista por defecto"
                    onClick={() => {
                      void lists
                        .updateList(active.id, { notesStyle: styleOverride })
                        .then(() => setStyleOverride(null));
                    }}
                    className="rounded-lg bg-[#66c0f4]/15 p-2 text-[#66c0f4] ring-1 ring-[#66c0f4]/30 transition hover:bg-[#66c0f4]/25"
                  >
                    <Pin size={14} />
                  </button>
                )}
                {isOwner && (
                  <>
                <button
                  type="button"
                  title="Renombrar"
                  aria-label="Renombrar lista"
                  onClick={() => {
                    setEditing((v) => !v);
                    setCreating(false);
                    setTitle(active.title);
                    setDescription(active.description);
                  }}
                  className="rounded-lg bg-white/5 p-2 text-[#8f98a0] ring-1 ring-white/10 transition hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  title="Eliminar lista"
                  aria-label="Eliminar lista"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar “${active.title}” con sus juegos?`)) {
                      void lists.deleteList(active.id).then(() => setActiveId(null));
                    }
                  }}
                  className="rounded-lg bg-white/5 p-2 text-[#8f98a0] ring-1 ring-white/10 transition hover:text-red-300"
                >
                  <Trash2 size={14} />
                </button>
                  </>
                )}
              </div>
          </div>

          {isOwner && editing && (
            <div className="flex flex-col gap-2 rounded-xl bg-black/20 p-4 ring-1 ring-white/10 sm:flex-row">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 rounded-lg bg-[#0e141b] px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none th-focus"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 rounded-lg bg-[#0e141b] px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none th-focus"
              />
              <button
                type="button"
                onClick={() => void submitRename()}
                disabled={busy || !title.trim()}
                className="rounded-lg th-btn px-4 py-2 text-sm font-semibold transition hover:brightness-110 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          )}

          {activeItems.length === 0 ? (
            <p className="rounded-xl bg-black/20 p-6 text-center text-sm text-[#8f98a0] ring-1 ring-white/10">
              {isOwner
                ? 'Lista vacía: abre un juego y usa “Añadir a lista”.'
                : 'Esta lista aún no tiene juegos.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {activeItems.map((it) => {
                const g = gameByKey.get(`${it.store}:${it.gameId}`);
                return (
                  <div key={it.id} className="relative">
                    {g ? (
                      <GameCard game={g} onSelect={onSelectGame} />
                    ) : (
                      <div className="overflow-hidden rounded-xl bg-[#1b2838]/80 p-4 ring-1 ring-white/10">
                        <p className="line-clamp-2 text-sm font-semibold text-white">{it.title || 'Juego'}</p>
                        <p className="mt-1 text-[11px] uppercase text-[#8f98a0]">{it.store}</p>
                      </div>
                    )}
                    {hasNotes &&
                      (destacado ? (
                        <p
                          title={it.note || undefined}
                          className="mt-1.5 min-h-12 line-clamp-3 rounded-r-md border-l-2 border-[var(--t-accent)] bg-white/5 px-2 py-1 text-xs italic text-white/85"
                        >
                          {it.note ? `“${it.note}”` : ' '}
                        </p>
                      ) : (
                        <p
                          title={it.note || undefined}
                          className="mt-1 min-h-8 line-clamp-2 text-xs italic text-[#8f98a0]"
                        >
                          {it.note ? `“${it.note}”` : ' '}
                        </p>
                      ))}
                    {isOwner && (
                      <button
                        type="button"
                        title="Quitar de la lista"
                        aria-label={`Quitar ${it.title} de la lista`}
                        onClick={() => void lists.removeItem(it.id)}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition hover:bg-red-900"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
