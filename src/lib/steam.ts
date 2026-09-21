import Papa from 'papaparse';
import type { Game } from '../types/game';

export const CSV_URL = `${import.meta.env.BASE_URL}data/steam-library.csv`;
export const GOG_URL = `${import.meta.env.BASE_URL}data/gog-library.json`;

/** Columnas núcleo que nunca son tags */
const CORE_FIELDS = new Set([
  'game',
  'id',
  'hours',
  'last_played',
  'steam_deck',
  'steam deck',
  'metascore',
  'userscore',
  'wilsonscore',
  'sdbrating',
  'userscore_count',
  'release_date',
  'win',
  'mac',
  'linux',
]);

const PLATFORM_FIELDS = new Set(['win', 'mac', 'linux']);

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function steamImageUrl(appId: number, kind: 'header' | 'capsule' = 'header'): string {
  if (!appId) return '';
  return kind === 'header'
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`
    : `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

export function storeUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}/`;
}

/** Portada de la card: Steam CDN por app id, GOG por URL de imagen. */
export function gameImageUrl(game: Game): string {
  if (game.store === 'gog') return game.coverUrl || '';
  return steamImageUrl(game.id);
}

/** Enlace a la tienda según la tienda del juego. */
export function gameStoreUrl(game: Game): string {
  if (game.store === 'gog') return game.storeUrl || 'https://www.gog.com/games';
  return storeUrl(game.id);
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'bg-slate-600/60 text-slate-300';
  if (score >= 85) return 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/30';
  if (score >= 75) return 'bg-lime-500/20 text-lime-300 ring-lime-400/30';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-300 ring-yellow-400/30';
  return 'bg-red-500/20 text-red-300 ring-red-400/30';
}

export function formatHours(h: number): string {
  if (!h || h <= 0) return 'Sin jugar';
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h`;
}

function cleanHeader(h: string): string {
  // Papa no siempre elimina el BOM del primer header
  return h.replace(/^\uFEFF/, '').trim();
}

export interface ParseResult {
  games: Game[];
  parseMs: number;
}

/** Parsea el CSV de la librería a un array ligero de Game. */
export function parseLibrary(csvText: string): ParseResult {
  const t0 = performance.now();
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: cleanHeader,
  });

  const fields = (parsed.meta.fields ?? []).map(cleanHeader);

  // El CSV está ordenado por secciones: núcleo → features → idiomas → géneros.
  // Detectamos los cortes por nombre para no mezclar idiomas en los tags.
  let genreStart = fields.indexOf('1980s');
  if (genreStart === -1) genreStart = Math.floor(fields.length * 0.7);
  let langStart = fields.indexOf('afrikaans');
  if (langStart === -1 || langStart > genreStart) langStart = genreStart;

  const games: Game[] = [];

  for (const row of parsed.data) {
    if (!row) continue;
    const rawId = (row['id'] ?? '').trim();
    const rawTitle = (row['game'] ?? '').trim();
    if (!rawId && !rawTitle) continue;
    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) continue;

    const tagSet = new Set<string>();
    const featureSet = new Set<string>();

    for (let i = 0; i < fields.length; i++) {
      const key = fields[i];
      if (CORE_FIELDS.has(key) || PLATFORM_FIELDS.has(key)) continue;
      if (row[key] !== 'x') continue;
      // Papa renombra cabeceras duplicadas como "co-op_1": mostramos el nombre base
      const label = key.replace(/_\d+$/, '');
      if (i >= genreStart) {
        if (tagSet.size < 60) tagSet.add(label);
      } else if (i >= langStart) {
        // idiomas → los ignoramos para la UI
        continue;
      } else {
        if (featureSet.size < 60) featureSet.add(label);
      }
    }

    const title = rawTitle || `App ${id}`;
    games.push({
      key: `steam:${id}`,
      store: 'steam',
      id,
      title,
      hours: Number(row['hours']) || 0,
      lastPlayed: (row['last_played'] ?? '').trim(),
      deck: ((row['steam_deck'] || row['steam deck'] || '') as string).trim().toLowerCase(),
      metascore: toNumberOrNull(row['metascore']),
      userscore: toNumberOrNull(row['userscore']),
      wilsonscore: toNumberOrNull(row['wilsonscore']),
      sdbrating: toNumberOrNull(row['sdbrating']),
      userscoreCount: toNumberOrNull(row['userscore_count']),
      releaseDate: (row['release_date'] ?? '').trim(),
      win: row['win'] === 'x',
      mac: row['mac'] === 'x',
      linux: row['linux'] === 'x',
      tags: [...tagSet],
      features: [...featureSet],
    });
  }

  return { games, parseMs: performance.now() - t0 };
}

export async function loadLibrary(signal?: AbortSignal): Promise<ParseResult> {
  const res = await fetch(CSV_URL, { signal });
  if (!res.ok) throw new Error(`No se pudo cargar el CSV (${res.status})`);
  const text = await res.text();
  return parseLibrary(text);
}

interface GogEntry {
  id: number;
  title: string;
  slug: string;
  storeUrl: string;
  steamHeader?: string;
  images?: { cover?: string; background?: string; logo?: string; icon?: string; tile?: string };
  genres?: string[];
  features?: string[];
  developers?: string[];
  publishers?: string[];
  releaseDate?: string;
  win?: boolean;
  mac?: boolean;
  linux?: boolean;
}

/** Carga la librería GOG enriquecida y la mapea al modelo Game. */
export async function loadGogLibrary(signal?: AbortSignal): Promise<Game[]> {
  const res = await fetch(GOG_URL, { signal });
  if (!res.ok) throw new Error(`No se pudo cargar GOG (${res.status})`);
  const entries = (await res.json()) as GogEntry[];
  return entries.map((e, i) => ({
    key: `gog:${e.id || 'x'}:${i}`,
    store: 'gog' as const,
    id: e.id || 0,
    title: e.title || 'Sin título',
    hours: 0,
    lastPlayed: '',
    deck: '',
    metascore: null,
    userscore: null,
    wilsonscore: null,
    sdbrating: null,
    userscoreCount: null,
    releaseDate: e.releaseDate || '',
    win: !!e.win,
    mac: !!e.mac,
    linux: !!e.linux,
    tags: e.genres || [],
    features: e.features || [],
    // Portada GOG: tile nativo 392x220, con fallback al header cruzado
    // de Steam y al resto de arte oficial de GOG. Steam no se toca.
    coverUrl:
      e.images?.tile ||
      e.steamHeader ||
      e.images?.background ||
      e.images?.cover ||
      e.images?.logo ||
      '',
    storeUrl: e.storeUrl || undefined,
    developers: e.developers || [],
    publishers: e.publishers || [],
  }));
}
