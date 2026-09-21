/** Formato de presentación para etiquetas en inglés: Title Case + siglas.
 * Los datos crudos se conservan intactos (conteos, filtros y búsqueda usan el original).
 */

/** Variantes del mismo concepto -> etiqueta canónica (se aplica al cargar). */
const SYNONYMS = new Map<string, string>([
  ['multi-player', 'multiplayer'],
  ['single-player', 'singleplayer'],
  ['real-time', 'Real-Time'],
  ["shoot'emup", "Shoot 'em Up"],
  ['turn-based', 'Turn-Based'],
]);

/** Unifica variantes conocidas ("Single-Player" -> "singleplayer"). */
export function canonicalRaw(label: string): string {
  return SYNONYMS.get(label.toLowerCase()) ?? label;
}

const UPPER = new Map<string, string>([
  ['trackir', 'TrackIR'],
  ['wsgf', 'WSGF'],
  ['4k', '4K'],
  ['ps4', 'PS4'],
  ['ps5', 'PS5'],
  ['vr', 'VR'],
  ['steamvr', 'SteamVR'],
  ['hdr', 'HDR'],
  ['lan', 'LAN'],
  ['geforce', 'GeForce'],
  ['ost', 'OST'],
]);

const ACRONYMS = new Set([
  'rpg', 'arpg', 'jrpg', 'crpg', 'srpg', 'fps', 'tps', 'fpp', 'tpp',
  'rts', 'moba', 'mmo', 'mmorpg', 'pvp', 'pve', 'fmv', 'ai',
  '2d', '3d', '2.5d', '4x', '6dof', 'atv', 'bmx',
]);

const SMALL = new Set([
  'and', 'or', 'of', 'the', 'a', 'an', 'on', 'in', 'at', 'to', 'for', 'with', 'vs',
]);

function capToken(tok: string): string {
  if (!tok) return tok;
  const lower = tok.toLowerCase();
  const fixed = UPPER.get(lower);
  if (fixed) return fixed;
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase();
}

/** "party-based rpg" -> "Party-Based RPG" · "single-player" -> "Single-Player" */
export function formatLabel(label: string): string {
  return label
    .split(' ')
    .map((word, i) => {
      if (i > 0 && !word.includes('-') && SMALL.has(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word
        .split('-')
        .map(capToken)
        .join('-');
    })
    .join(' ');
}
