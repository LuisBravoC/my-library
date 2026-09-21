import Papa from 'papaparse';
import type { Game } from '../types/game';

export const CSV_URL = `${import.meta.env.BASE_URL}data/steam-library.csv`;

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

    games.push({
      id,
      title: rawTitle || `App ${id}`,
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
