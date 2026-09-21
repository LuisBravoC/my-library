import { memo, useState } from 'react';
import { Clock3, Star } from 'lucide-react';
import { formatHours, gameImageUrl, scoreColor, steamImageUrl } from '../lib/steam';
import { formatLabel } from '../lib/labels';
import type { Game } from '../types/game';

interface Props {
  game: Game;
  onSelect: (game: Game) => void;
}

/** Precarga la imagen grande del modal para que abra al instante. */
function preloadModalImage(game: Game): void {
  const src = game.store === 'steam' ? steamImageUrl(game.id, 'capsule') : gameImageUrl(game);
  if (src) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }
}

function GameCardInner({ game, onSelect }: Props) {
  const [imgOk, setImgOk] = useState(true);
  const src = gameImageUrl(game);

  return (
    <button
      type="button"
      onClick={() => onSelect(game)}
      onMouseEnter={() => preloadModalImage(game)}
      onFocus={() => preloadModalImage(game)}
      className="card-in group overflow-hidden rounded-xl bg-[#1b2838]/80 text-left ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:ring-[#66c0f4]/50 hover:shadow-[0_8px_30px_rgba(102,192,244,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#66c0f4]"
    >
      <div className="relative aspect-[460/215] w-full overflow-hidden bg-gradient-to-br from-[#2a475e] to-[#171a21]">
        {imgOk && src ? (
          <img
            src={src}
            alt={game.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center">
            <span className="line-clamp-2 text-sm font-semibold text-[#c7d5e0]/80">{game.title}</span>
          </div>
        )}
        {game.store === 'gog' && (
          <span className="absolute left-2 top-2 rounded-md bg-[#7b1fa2]/90 px-2 py-0.5 text-[11px] font-bold text-white">
            GOG
          </span>
        )}
        {game.hours > 0 && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-[#c7d5e0]">
            <Clock3 size={12} />
            {formatHours(game.hours)}
          </span>
        )}
        {game.metascore !== null && (
          <span
            className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ${scoreColor(game.metascore)}`}
          >
            {game.metascore}
          </span>
        )}
      </div>

      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-white" title={game.title}>
          {game.title}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-[#8f98a0]">
          {game.userscore !== null ? (
            <span className="inline-flex items-center gap-1">
              <Star size={12} className="text-yellow-400/80" />
              {game.userscore}%
              {game.userscoreCount ? (
                <span className="text-[#8f98a0]/70">({game.userscoreCount.toLocaleString('es-ES')})</span>
              ) : null}
            </span>
          ) : (
            <span>{game.releaseDate ? game.releaseDate.slice(0, 4) : '—'}</span>
          )}
          <span className="flex gap-1 font-bold">
            {game.win && <span className="rounded bg-white/10 px-1">WIN</span>}
            {game.mac && <span className="rounded bg-white/10 px-1">MAC</span>}
            {game.linux && <span className="rounded bg-white/10 px-1">LIN</span>}
          </span>
        </div>
        {game.tags.length > 0 && (
          <p className="line-clamp-1 text-[11px] text-[#66c0f4]/80">{game.tags.slice(0, 3).map(formatLabel).join(' · ')}</p>
        )}
      </div>
    </button>
  );
}

const GameCard = memo(GameCardInner);
export default GameCard;
