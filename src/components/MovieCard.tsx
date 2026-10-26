import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Ticket, Film } from 'lucide-react';
import { Movie } from '../../server/types.js';

interface MovieCardProps {
  movie: Movie;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group flex flex-col bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden hover:border-slate-700 hover:shadow-xl hover:shadow-black/50 transition-all duration-200">
      {/* Poster Media */}
      <Link to={`/movies/${movie._id}`} className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950 block">
        {!imageError && movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 to-slate-950">
            <Film className="w-12 h-12 text-slate-700 mb-3" />
            <span className="text-sm font-semibold text-slate-300">{movie.title}</span>
            <span className="text-xs text-slate-500 mt-1">{movie.genre.slice(0, 2).join(' · ')}</span>
          </div>
        )}

        {/* Rating overlay badge (subtle corner score with star) */}
        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 flex items-center gap-1.5 text-xs text-amber-300 font-medium">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-mono tabular-nums">{movie.rating.toFixed(1)}</span>
        </div>

        {/* Status tag */}
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 text-[11px] font-medium text-slate-300 tracking-wide">
          {movie.status === 'currently showing' ? 'NOW SHOWING' : 'UPCOMING'}
        </div>
      </Link>

      {/* Details container */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Metadata: Unboxed text with typographic separator (Anti-Slop rule) */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 truncate">
            <span>{movie.genre.slice(0, 2).join(', ')}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="font-mono tabular-nums">{movie.duration}m</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{movie.language[0]}</span>
          </div>

          {/* Title */}
          <Link
            to={`/movies/${movie._id}`}
            className="text-base font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1 mb-2"
          >
            {movie.title}
          </Link>

          {/* Short description */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {movie.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
          <Link
            to={`/movies/${movie._id}`}
            className="w-full py-2 px-3 text-xs font-semibold text-center text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            Details
          </Link>
          <Link
            to={`/movies/${movie._id}`}
            className="w-full py-2 px-3 text-xs font-semibold text-center text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm shadow-rose-600/30 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Book</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
