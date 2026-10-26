import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, RotateCcw, Film } from 'lucide-react';
import { MovieCard } from '../components/MovieCard.js';
import { apiRequest } from '../services/api.js';
import { Movie } from '../../server/types.js';

export const MoviesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States from URL or defaults
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || 'all';
  const genre = searchParams.get('genre') || 'all';
  const language = searchParams.get('language') || 'all';
  const sortBy = searchParams.get('sortBy') || 'releaseDate';

  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (search) query.set('search', search);
        if (status !== 'all') query.set('status', status);
        if (genre !== 'all') query.set('genre', genre);
        if (language !== 'all') query.set('language', language);
        if (sortBy) query.set('sortBy', sortBy);

        const res = await apiRequest<{ success: boolean; movies: Movie[] }>(
          `/api/movies?${query.toString()}`
        );

        if (res.success) {
          setMovies(res.movies);

          // Extract unique genres & languages for filters
          const allG = new Set<string>();
          const allL = new Set<string>();
          res.movies.forEach((m) => {
            m.genre.forEach((g) => allG.add(g));
            m.language.forEach((l) => allL.add(l));
          });
          setAvailableGenres(Array.from(allG));
          setAvailableLanguages(Array.from(allL));
        }
      } catch (err) {
        console.error('Failed to load movies:', err);
      } finally {
        setLoading(false);
      }
    }

    loadMovies();
  }, [search, status, genre, language, sortBy]);

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen">
      {/* Title & Search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Movie Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">Browse current theatrical releases and upcoming blockbusters.</p>
        </div>

        {/* Search */}
        <div className="relative min-w-[280px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, director, or cast..."
            value={search}
            onChange={(e) => updateParam('search', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Filter and Sort Toolbar (Anti-slop clean segmented buttons) */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => updateParam('status', 'all')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                status === 'all'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Releases
            </button>
            <button
              onClick={() => updateParam('status', 'currently showing')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                status === 'currently showing'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Now Showing
            </button>
            <button
              onClick={() => updateParam('status', 'upcoming')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                status === 'upcoming'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upcoming Premieres
            </button>
          </div>

          {/* Reset Filters button if any active */}
          {(search || status !== 'all' || genre !== 'all' || language !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Secondary Dropdowns: Genre, Language, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60 text-xs">
          {/* Genre Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">Genre:</span>
            <select
              value={genre}
              onChange={(e) => updateParam('genre', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Genres</option>
              {availableGenres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Language Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">Language:</span>
            <select
              value={language}
              onChange={(e) => updateParam('language', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">All Languages</option>
              {availableLanguages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => updateParam('sortBy', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="releaseDate">Latest Release</option>
              <option value="rating">Highest Rating</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movies Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-slate-900/40 rounded-xl h-96 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800">
          <Film className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-white">No Movies Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            We couldn't find any movies matching your current filters. Try resetting your search or filter options.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 font-medium">
            Showing <span className="font-mono tabular-nums text-white font-semibold">{movies.length}</span> movies
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
