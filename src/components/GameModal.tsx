import { useEffect } from 'react';
import { Calendar, Clock3, ExternalLink, Star, Trophy, X } from 'lucide-react';
import { formatHours, scoreColor, steamImageUrl, storeUrl } from '../lib/steam';
import type { Game } from '../types/game';

interface Props {
  game: Game | null;
  onClose: () => void;
}

export default function GameModal({ game, onClose }: Props) {
  useEffect(() => {
    if (!game) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [game, onClose]);

  if (!game) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={game.title}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-[#1b2838] ring-1 ring-white/10 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={steamImageUrl(game.id, 'capsule')}
            alt={game.title}
            className="aspect-[616/353] w-full bg-[#0e141b] object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = steamImageUrl(game.id);
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-xl font-bold text-white">{game.title}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#8f98a0]">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} /> {formatHours(game.hours)}
              </span>
              {game.releaseDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} /> {game.releaseDate}
                </span>
              )}
              {game.lastPlayed && <span>Última sesión: {game.lastPlayed}</span>}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-black/30 p-3">
              <p className="mb-1 flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-[#8f98a0]">
                <Trophy size={12} /> Metascore
              </p>
              <span className={`inline-block rounded-md px-2.5 py-1 text-lg font-bold ring-1 ${scoreColor(game.metascore)}`}>
                {game.metascore ?? '—'}
              </span>
            </div>
            <div className="rounded-lg bg-black/30 p-3">
              <p className="mb-1 flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide text-[#8f98a0]">
                <Star size={12} /> Usuarios
              </p>
              <span className="text-lg font-bold text-white">{game.userscore !== null ? `${game.userscore}%` : '—'}</span>
              {game.userscoreCount ? (
                <p className="text-[11px] text-[#8f98a0]">{game.userscoreCount.toLocaleString('es-ES')} votos</p>
              ) : null}
            </div>
            <div className="rounded-lg bg-black/30 p-3">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-[#8f98a0]">Plataformas</p>
              <p className="flex justify-center gap-1 text-[11px] font-bold">
                {game.win && <span className="rounded bg-white/10 px-1.5 py-0.5">WIN</span>}
                {game.mac && <span className="rounded bg-white/10 px-1.5 py-0.5">MAC</span>}
                {game.linux && <span className="rounded bg-white/10 px-1.5 py-0.5">LIN</span>}
                {!game.win && !game.mac && !game.linux && <span className="text-[#8f98a0]">—</span>}
              </p>
              {game.deck && game.deck !== 'unknown' && (
                <p className="mt-1 text-[11px] capitalize text-[#66c0f4]">Deck: {game.deck}</p>
              )}
            </div>
          </div>

          {game.tags.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8f98a0]">Etiquetas</h3>
              <div className="flex flex-wrap gap-1.5">
                {game.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[#66c0f4]/10 px-2.5 py-1 text-xs text-[#66c0f4] ring-1 ring-[#66c0f4]/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {game.features.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8f98a0]">Características</h3>
              <div className="flex flex-wrap gap-1.5">
                {game.features.slice(0, 24).map((f) => (
                  <span key={f} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-[#c7d5e0] ring-1 ring-white/10">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          <a
            href={storeUrl(game.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#06bfff] to-[#2d73ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Ver en Steam <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
