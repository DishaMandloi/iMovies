import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Film, Ticket, Sparkles, ChevronRight, Star, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { MovieCard } from '../components/MovieCard.js';
import { apiRequest } from '../services/api.js';
import { Movie } from '../../server/types.js';

export const HomePage: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchMovies() {
      try {
        const res = await apiRequest<{ success: boolean; movies: Movie[] }>('/api/movies');
        if (res.success) {
          setMovies(res.movies);
        }
      } catch (err) {
        console.error('Error fetching homepage movies:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMovies();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/movies');
    }
  };

  const currentlyShowing = movies.filter((m) => m.status === 'currently showing');
  const upcoming = movies.filter((m) => m.status === 'upcoming');
  const spotlightMovie = currentlyShowing[0] || movies[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 border-b border-slate-900">
        {/* Cinematic Backdrop Image with Scrim */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/hero_cinema_hall_1792995217612.jpg"
            alt="IMovies IMAX Theatre"
            className="w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-2xl space-y-6">
            {/* Header text with balanced wrap */}
            <div className="space-y-3">
              <span className="text-xs font-semibold tracking-wider uppercase text-rose-500">
                Premium Cinema Experience
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none text-balance">
                Book Your Seats for Tomorrow's Greatest Stories.
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Experience real-time seat selection with 10-minute reservation locks, 4K laser projection, and reserved luxury recliners at top Metropolis theatres.
              </p>
            </div>

            {/* Quick Search Bar */}
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl max-w-lg shadow-xl shadow-black/40 backdrop-blur-md">
                <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Search movies by title, actor, or genre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder-slate-400 px-2 py-1.5 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shrink-0 transition-colors shadow-sm"
                >
                  Find Tickets
                </button>
              </div>
            </form>

            {/* Key feature callouts */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Real-Time Seat Locks
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-400" />
                Instant Confirmation
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-400" />
                Top Metropolis Cineplexes
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 w-full flex-1">
        {/* Section 1: Currently Showing Movies */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Now Showing in Theatres</h2>
              <p className="text-xs text-slate-400 mt-1">Select a movie to browse available showtimes and reserve your seats.</p>
            </div>
            <Link
              to="/movies"
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
            >
              <span>View All Movies</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-slate-900/40 rounded-xl h-96 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentlyShowing.slice(0, 4).map((movie) => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Featured Spotlight Banner */}
        {spotlightMovie && (
          <section className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 p-6 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <span className="text-xs font-bold tracking-wider uppercase text-amber-400">
                  Featured Premiere of the Week
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-white">
                  {spotlightMovie.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold font-mono tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {spotlightMovie.rating.toFixed(1)} / 10
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{spotlightMovie.genre.join(', ')}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{spotlightMovie.duration} mins</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                  {spotlightMovie.description}
                </p>
                <div className="pt-2 flex items-center gap-4">
                  <Link
                    to={`/movies/${spotlightMovie._id}`}
                    className="px-6 py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    <span>Select Showtimes & Seats</span>
                  </Link>
                  <Link
                    to={`/movies/${spotlightMovie._id}`}
                    className="px-5 py-3 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-4 flex justify-center">
                <div className="w-48 sm:w-56 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-slate-700">
                  <img
                    src={spotlightMovie.posterUrl}
                    alt={spotlightMovie.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 3: Upcoming Releases */}
        {upcoming.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Upcoming Premieres</h2>
                <p className="text-xs text-slate-400 mt-1">Mark your calendars for the most anticipated cinema releases.</p>
              </div>
              <Link
                to="/movies?status=upcoming"
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
              >
                <span>View Upcoming</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {upcoming.map((movie) => (
                <MovieCard key={movie._id} movie={movie} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
