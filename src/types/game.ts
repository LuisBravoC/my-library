export interface Game {
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
  /** Géneros / tags (sección final del CSV: 1980s … zoo) */
  tags: string[];
  /** Características (co-op, single-player, achievements…) */
  features: string[];
}

export type SortKey = 'title' | 'hours' | 'metascore' | 'userscore' | 'releaseDate';
export type PlatformFilter = 'all' | 'win' | 'mac' | 'linux';
export type PlayedFilter = 'all' | 'played' | 'unplayed';
