import type { StoreFilter } from '../types/game';

const STORES: readonly string[] = ['steam', 'gog'];

function fromSegment(seg: string | null | undefined): StoreFilter | null {
  const s = (seg || '').toLowerCase();
  return STORES.includes(s) ? (s as StoreFilter) : null;
}

/** Lee la tienda indicada en la URL: `#/steam`, `?store=steam` o `/.../steam`.
 * El segmento de ruta se busca al final para no depender del subpath de despliegue. */
export function parseStoreFromUrl(href: string): StoreFilter | null {
  const url = new URL(href);
  const byHash = fromSegment(url.hash.replace(/^#\/?/, '').split('/')[0]);
  if (byHash) return byHash;
  const byQuery = fromSegment(url.searchParams.get('store'));
  if (byQuery) return byQuery;
  const segs = url.pathname.split('/').filter(Boolean);
  const last = (segs[segs.length - 1] || '').replace(/\.html?$/i, '');
  return fromSegment(last);
}

/** URL canónica de una tienda en relativo: respeta el subpath (repo/, dominio, dev). */
export function storeHref(store: StoreFilter, base: string): string {
  return routeHref({ kind: 'store', store }, base);
}

export type Route =
  | { kind: 'store'; store: StoreFilter }
  | { kind: 'login' }
  | { kind: 'list'; slug: string };

/** Ruta de la app: tienda, /login o /lista/:slug. null = raíz. */
export function parseRoute(href: string): Route | null {
  const url = new URL(href);
  const clean = (s: string | null | undefined) => (s || '').toLowerCase();
  const hashSegs = url.hash.replace(/^#\/?/, '').split('/').map(clean).filter(Boolean);
  const queryStore = clean(url.searchParams.get('store'));
  const queryLista = clean(url.searchParams.get('lista'));
  const pathSegs = url.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => clean(s.replace(/\.html?$/i, '')));
  // Primero formas explícitas: #/..., ?store=, ?lista=
  const explicit = [...hashSegs, queryStore, queryLista].filter(Boolean);
  for (const seg of explicit) {
    if (seg === 'login') return { kind: 'login' };
    if (seg === 'steam' || seg === 'gog') return { kind: 'store', store: seg };
  }
  if (hashSegs[0] === 'lista' && hashSegs[1]) return { kind: 'list', slug: hashSegs[1] };
  if (queryLista) return { kind: 'list', slug: queryLista };
  // Rutas de path: /steam, /login, /lista/:slug (el segmento final, sin importar el base)
  if (pathSegs[0] === 'lista' || pathSegs[pathSegs.length - 2] === 'lista') {
    const slug = pathSegs[pathSegs.length - 1];
    if (slug && slug !== 'lista') return { kind: 'list', slug };
  }
  const last = pathSegs[pathSegs.length - 1] || '';
  if (last === 'login') return { kind: 'login' };
  if (last === 'steam' || last === 'gog') return { kind: 'store', store: last };
  return null;
}

/** Directorio raíz de la app: quita segmentos de ruta (/lista/:slug, tienda, login, index). */
function appBaseDir(url: URL): string {
  const segs = url.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.toLowerCase().replace(/\.html?$/i, ''));
  const s = [...segs];
  if (s.length >= 2 && s[s.length - 2] === 'lista') s.splice(-2);
  const last = s[s.length - 1] || '';
  if (['steam', 'gog', 'login', 'index'].includes(last)) s.pop();
  return s.length ? `/${s.join('/')}/` : '/';
}

/** URL canónica de una ruta en relativo (respeta el subpath de despliegue). */
export function routeHref(route: Route, base: string): string {
  const url = new URL(base);
  const path = route.kind === 'login' ? 'login' : route.kind === 'list' ? `lista/${route.slug}` : route.store;
  return `${url.origin}${appBaseDir(url)}${path}`;
}

/** Slug URL-friendly a partir del título + sufijo corto anti-colisiones. */
export function makeSlug(title: string, taken: Set<string>): string {
  const base =
    title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'lista';
  let slug = base;
  while (taken.has(slug)) {
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return slug;
}
