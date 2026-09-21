import { useEffect, useState } from 'react';
import { loadGogLibrary, loadLibrary } from '../lib/steam';
import type { Game } from '../types/game';

export interface LibraryState {
  steamGames: Game[];
  gogGames: Game[];
  loading: boolean;
  error: string | null;
  parseMs: number;
}

export function useLibrary(): LibraryState {
  const [steamGames, setSteamGames] = useState<Game[]>([]);
  const [gogGames, setGogGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parseMs, setParseMs] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    Promise.all([loadLibrary(controller.signal), loadGogLibrary(controller.signal)])
      .then(([{ games, parseMs }, gog]) => {
        if (cancelled) return;
        setSteamGames(games);
        setGogGames(gog);
        setParseMs(parseMs);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return { steamGames, gogGames, loading, error, parseMs };
}
