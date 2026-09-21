export type Store = 'steam' | 'gog';

export interface Game {
  /** Clave única para React (store:id:title) */
  key: string;
  store: Store;
  id: number;
  title: string;
  hours: number;
  lastPlayed: string;
  deck: string;
  metascore: number | null;
  userscore: number | null;
  wilsonscore: number | null;
  sdbrating: number | null;
  userscoreCount: number | null;
  releaseDate: string;
  win: boolean;
  mac: boolean;
  linux: boolean;
  /** Géneros / tags */
  tags: string[];
  /** Características */
  features: string[];
  /** Soporte VR */
  vr: string[];
  /** Opciones de accesibilidad */
  accessibility: string[];
  /** Idiomas con 'x' */
  languages: string[];  /** Portada (GOG). Steam usa la CDN por app id. */
  coverUrl?: string;
  /** Enlace a la tienda (GOG). Steam se construye por app id. */
  storeUrl?: string;
  developers?: string[];
  publishers?: string[];
}

export type SortKey = 'title' | 'hours' | 'metascore' | 'userscore' | 'releaseDate';
export type PlatformFilter = 'all' | 'win' | 'mac' | 'linux';
export type PlayedFilter = 'all' | 'played' | 'unplayed';
export type StoreFilter = 'steam' | 'gog';
