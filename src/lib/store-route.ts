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
  return new URL(store, base).href;
}
