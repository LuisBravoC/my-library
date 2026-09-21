import { useEffect, useState } from 'react';
import { loadLibrary } from '../lib/steam';
import type { Game } from '../types/game';

export interface LibraryState {
  games: Game[];
  loading: boolean;
  error: string | null;
  parseMs: number;
}

export function useLibrary(): LibraryState {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parseMs, setParseMs] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    loadLibrary(controller.signal)
      .then(({ games, parseMs }) => {
        if (cancelled) return;
        setGames(games);
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

  return { games, loading, error, parseMs };
}
