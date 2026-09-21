import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  Building2,
  Clock3,
  Gamepad2,
  LibraryBig,
  Monitor,
  Search,
  SlidersHorizontal,
  Star,
  Tags,
  Trophy,
  X,
} from 'lucide-react';
import GameCard from './components/GameCard';
import GameModal from './components/GameModal';
import { useLibrary } from './hooks/useLibrary';
import type { Game, PlatformFilter, PlayedFilter, SortKey, StoreFilter } from './types/game';

const PAGE_SIZE = 48;

const STEAM_SORTS: { value: SortKey; label: string }[] = [
  { value: 'hours', label: 'Más jugados' },
  { value: 'metascore', label: 'Metascore' },
  { value: 'userscore', label: 'Nota usuarios' },
  { value: 'releaseDate', label: 'Lanzamiento' },
  { value: 'title', label: 'Nombre (A–Z)' },
];

const GOG_SORTS: { value: SortKey; label: string }[] = [
  { value: 'releaseDate', label: 'Lanzamiento' },
  { value: 'title', label: 'Nombre (A–Z)' },
];

function compareBy(sort: SortKey) {
  return (a: Game, b: Game): number => {
    switch (sort) {
      case 'hours':
        return b.hours - a.hours || a.title.localeCompare(b.title, 'es');
      case 'metascore':
        return (b.metascore ?? -1) - (a.metascore ?? -1) || a.title.localeCompare(b.title, 'es');
      case 'userscore':
        return (b.userscore ?? -1) - (a.userscore ?? -1) || a.title.localeCompare(b.title, 'es');
      case 'releaseDate':
        return (b.releaseDate || '').localeCompare(a.releaseDate || '') || a.title.localeCompare(b.title, 'es');
      case 'title':
      default:
        return a.title.localeCompare(b.title, 'es');
    }
  };
}

const selectCls =
  'rounded-lg bg-[#0e141b] px-3 py-2 text-sm text-[#c7d5e0] ring-1 ring-white/10 focus:outline-none focus:ring-[#66c0f4]/60';

export default function App() {
  const { steamGames, gogGames, loading, error, parseMs } = useLibrary();

  const [store, setStore] = useState<StoreFilter>('steam');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState<SortKey>('hours');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [played, setPlayed] = useState<PlayedFilter>('all');
  const [minScore, setMinScore] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Game | null>(null);

  const isGog = store === 'gog';
  const sourceGames = isGog ? gogGames : steamGames;
  const sortOptions = isGog ? GOG_SORTS : STEAM_SORTS;

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [store, deferredQuery, sort, platform, played, minScore, activeTag]);

  // Al cambiar de tienda, ajustar el orden por defecto
  useEffect(() => {
    setSort(isGog ? 'releaseDate' : 'hours');
    setPlayed('all');
    setMinScore(0);
    setActiveTag(null);
  }, [isGog]);

  const stats = useMemo(() => {
    if (!isGog) {
      let playedCount = 0;
      let totalHours = 0;
      let scoreSum = 0;
      let scoreCount = 0;
      for (const g of sourceGames) {
        if (g.hours > 0) {
          playedCount += 1;
          totalHours += g.hours;
        }
        if (g.metascore !== null) {
          scoreSum += g.metascore;
          scoreCount += 1;
        }
      }
      return [
        { icon: <LibraryBig size={16} />, label: 'Juegos', value: sourceGames.length.toLocaleString('es-ES') },
        { icon: <Gamepad2 size={16} />, label: 'Jugados', value: playedCount.toLocaleString('es-ES') },
        { icon: <Clock3 size={16} />, label: 'Horas totales', value: Math.round(totalHours).toLocaleString('es-ES') },
        { icon: <Trophy size={16} />, label: 'Metascore medio', value: scoreCount ? String(Math.round(scoreSum / scoreCount)) : '—' },
      ];
    }
    const genres = new Set<string>();
    const devs = new Set<string>();
    let onWindows = 0;
    for (const g of sourceGames) {
      for (const t of g.tags) genres.add(t);
      for (const d of g.developers || []) devs.add(d);
      if (g.win) onWindows += 1;
    }
    return [
      { icon: <LibraryBig size={16} />, label: 'Juegos', value: sourceGames.length.toLocaleString('es-ES') },
      { icon: <Tags size={16} />, label: 'Géneros', value: genres.size.toLocaleString('es-ES') },
      { icon: <Building2 size={16} />, label: 'Desarrolladoras', value: devs.size.toLocaleString('es-ES') },
      { icon: <Monitor size={16} />, label: 'En Windows', value: onWindows.toLocaleString('es-ES') },
    ];
  }, [sourceGames, isGog]);

  const popularTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of sourceGames) {
      for (const t of g.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [sourceGames]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const out = sourceGames.filter((g) => {
      if (platform === 'win' && !g.win) return false;
      if (platform === 'mac' && !g.mac) return false;
      if (platform === 'linux' && !g.linux) return false;
      if (!isGog) {
        if (played === 'played' && g.hours <= 0) return false;
        if (played === 'unplayed' && g.hours > 0) return false;
        if (minScore > 0 && (g.metascore ?? -1) < minScore) return false;
      }
      if (activeTag && !g.tags.includes(activeTag)) return false;
      if (q) {
        const hay = `${g.title} ${g.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return out.sort(compareBy(sort));
  }, [sourceGames, deferredQuery, sort, platform, played, minScore, activeTag, isGog]);

  const hasFilters =
    query.trim() !== '' || platform !== 'all' || activeTag !== null ||
    (!isGog && (played !== 'all' || minScore > 0));

  const clearFilters = () => {
    setQuery('');
    setPlatform('all');
    setPlayed('all');
    setMinScore(0);
    setActiveTag(null);
  };

  return (
    <div className="min-h-screen bg-[#171a21] text-[#c7d5e0]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#171a21]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#66c0f4] to-[#2d73ff] text-[#171a21]">
            <Gamepad2 size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight text-white sm:text-lg">
              MySteamLibrary
            </h1>
            <p className="text-[11px] text-[#8f98a0] sm:text-xs">
              {loading ? 'Cargando…' : `${steamGames.length.toLocaleString('es-ES')} Steam · ${gogGames.length.toLocaleString('es-ES')} GOG`}
            </p>
          </div>
          <div className="relative ml-auto hidden w-72 md:block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f98a0]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título o etiqueta…"
              className="w-full rounded-lg bg-[#0e141b] py-2 pl-9 pr-8 text-sm text-white placeholder:text-[#8f98a0]/70 ring-1 ring-white/10 focus:outline-none focus:ring-[#66c0f4]/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#8f98a0] hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8f98a0]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título o etiqueta…"
              className="w-full rounded-lg bg-[#0e141b] py-2 pl-9 pr-8 text-sm text-white placeholder:text-[#8f98a0]/70 ring-1 ring-white/10 focus:outline-none focus:ring-[#66c0f4]/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#8f98a0] hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Pestañas de tienda */}
        <div className="flex gap-2">
          {(
            [
              { value: 'steam', label: 'Steam', count: steamGames.length },
              { value: 'gog', label: 'GOG', count: gogGames.length },
            ] as const
          ).map((t) => {
            const active = store === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setStore(t.value)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition sm:flex-none sm:px-8 ${
                  active
                    ? 'bg-gradient-to-r from-[#06bfff] to-[#2d73ff] text-white ring-transparent'
                    : 'bg-[#1b2838]/80 text-[#8f98a0] ring-white/10 hover:text-white hover:ring-[#66c0f4]/40'
                }`}
              >
                {t.label}{' '}
                <span className={`ml-1 font-medium ${active ? 'text-white/80' : 'text-[#8f98a0]/70'}`}>
                  {loading ? '…' : t.count.toLocaleString('es-ES')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-[#1b2838]/80 p-3.5 ring-1 ring-white/10 sm:p-4">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#8f98a0]">
                {s.icon} {s.label}
              </p>
              <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{loading ? '…' : s.value}</p>
            </div>
          ))}
        </section>

        {/* Toolbar */}
        <section className="space-y-3 rounded-xl bg-[#1b2838]/60 p-3.5 ring-1 ring-white/10 sm:p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8f98a0]">
            <SlidersHorizontal size={14} /> Filtros
          </p>
          <div className={`grid grid-cols-2 gap-2 ${isGog ? 'sm:grid-cols-2' : 'sm:grid-cols-4'}`}>
            <label className="space-y-1 text-xs text-[#8f98a0]">
              <span className="flex items-center gap-1"><ArrowDownWideNarrow size={12} /> Ordenar</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${selectCls} w-full`}>
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-[#8f98a0]">
              <span>Plataforma</span>
              <select value={platform} onChange={(e) => setPlatform(e.target.value as PlatformFilter)} className={`${selectCls} w-full`}>
                <option value="all">Todas</option>
                <option value="win">Windows</option>
                <option value="mac">macOS</option>
                <option value="linux">Linux</option>
              </select>
            </label>
            {!isGog && (
              <label className="space-y-1 text-xs text-[#8f98a0]">
                <span>Estado</span>
                <select value={played} onChange={(e) => setPlayed(e.target.value as PlayedFilter)} className={`${selectCls} w-full`}>
                  <option value="all">Todos</option>
                  <option value="played">Jugados</option>
                  <option value="unplayed">Sin jugar</option>
                </select>
              </label>
            )}
            {!isGog && (
              <label className="space-y-1 text-xs text-[#8f98a0]">
                <span className="flex items-center gap-1"><Star size={12} /> Nota mínima</span>
                <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className={`${selectCls} w-full`}>
                  <option value={0}>Todas</option>
                  <option value={85}>85+ obra maestra</option>
                  <option value={75}>75+ notable</option>
                  <option value={60}>60+ aprobado</option>
                </select>
              </label>
            )}
          </div>
          {popularTags.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {popularTags.map(([tag, count]) => {
                const active = activeTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(active ? null : tag)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ring-1 transition ${
                      active
                        ? 'bg-[#66c0f4] font-semibold text-[#171a21] ring-[#66c0f4]'
                        : 'bg-white/5 text-[#c7d5e0] ring-white/10 hover:ring-[#66c0f4]/50'
                    }`}
                  >
                    {tag} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Resultados */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-[#8f98a0]">
              {loading ? (
                'Cargando bibliotecas…'
              ) : (
                <>
                  <span className="font-semibold text-white">{filtered.length.toLocaleString('es-ES')}</span>{' '}
                  {filtered.length === 1 ? 'juego' : 'juegos'}
                  {!loading && !isGog && parseMs > 0 && (
                    <span className="ml-2 hidden text-xs sm:inline">· CSV parseado en {Math.round(parseMs)} ms</span>
                  )}
                </>
              )}
            </p>
            {hasFilters && !loading && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-[#c7d5e0] ring-1 ring-white/10 hover:ring-[#66c0f4]/50"
              >
                <X size={13} /> Limpiar filtros
              </button>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-xl bg-[#1b2838]/80 ring-1 ring-white/10">
                  <div className="aspect-[460/215] bg-white/5" />
                  <div className="space-y-2 p-3">
                    <div className="h-3.5 w-3/4 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl bg-red-500/10 p-6 text-center ring-1 ring-red-400/30">
              <p className="font-semibold text-red-300">No se pudo cargar la biblioteca</p>
              <p className="mt-1 text-sm text-red-200/70">{error}</p>
              <p className="mt-2 text-xs text-[#8f98a0]">Comprueba que existen <code>public/data/steam-library.csv</code> y <code>public/data/gog-library.json</code></p>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-xl bg-[#1b2838]/60 p-10 text-center ring-1 ring-white/10">
              <Gamepad2 size={32} className="mx-auto text-[#8f98a0]" />
              <p className="mt-3 font-semibold text-white">Sin resultados</p>
              <p className="mt-1 text-sm text-[#8f98a0]">Prueba con otra búsqueda o limpia los filtros.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-lg bg-[#66c0f4]/15 px-4 py-2 text-sm font-semibold text-[#66c0f4] ring-1 ring-[#66c0f4]/30 hover:bg-[#66c0f4]/25"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filtered.slice(0, visible).map((g) => (
                  <GameCard key={g.key} game={g} onSelect={setSelected} />
                ))}
              </div>
              <div className="mt-6 text-center">
                <p className="mb-3 text-xs text-[#8f98a0]">
                  Mostrando {Math.min(visible, filtered.length).toLocaleString('es-ES')} de{' '}
                  {filtered.length.toLocaleString('es-ES')}
                </p>
                {visible < filtered.length && (
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="rounded-lg bg-gradient-to-r from-[#06bfff] to-[#2d73ff] px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Cargar más
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-white/5 py-5 text-center text-xs text-[#8f98a0]">
        MySteamLibrary · datos locales de tus CSV/JSON · imágenes de Steam y GOG CDN
      </footer>

      <GameModal game={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
