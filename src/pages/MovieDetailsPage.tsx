import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Clock, Calendar, Ticket, MapPin, ChevronLeft, Film, Shield, Sparkles } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { Movie, Showtime, Theatre, Screen } from '../../server/types.js';

interface EnrichedTheatre extends Omit<Theatre, 'screens'> {
  screens: Screen[];
}

export const MovieDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [theatres, setTheatres] = useState<EnrichedTheatre[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    async function fetchMovieDetails() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await apiRequest<{
          success: boolean;
          movie: Movie;
          showtimes: Showtime[];
          theatres: EnrichedTheatre[];
        }>(`/api/movies/${id}`);

        if (res.success) {
          setMovie(res.movie);
          setShowtimes(res.showtimes);
          setTheatres(res.theatres);

          // Default selected date to the first available date with showtimes or today
          const today = new Date().toISOString().split('T')[0];
          const availableDates = Array.from(new Set(res.showtimes.map((s) => s.date))).sort();
          if (availableDates.length > 0) {
            setSelectedDate(availableDates.includes(today) ? today : availableDates[0]);
          } else {
            setSelectedDate(today);
          }
        }
      } catch (err) {
        console.error('Error fetching movie details:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMovieDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-400">Loading cinema details...</span>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <Film className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Movie Not Found</h2>
        <p className="text-xs text-slate-400">The requested film may have ended its theatrical run or does not exist.</p>
        <Link to="/movies" className="inline-block px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 rounded-lg">
          Back to Movies
        </Link>
      </div>
    );
  }

  // Generate 6 upcoming selectable days
  const dateOptions: { label: string; dateStr: string; dayOfWeek: string }[] = [];
  const baseDate = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dateOptions.push({ label, dateStr, dayOfWeek });
  }

  // Filter showtimes for the selected date
  const filteredShowtimes = showtimes.filter((s) => s.date === selectedDate);

  return (
    <div className="min-h-screen pb-20">
      {/* Back button bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/movies"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Movie Listings</span>
        </Link>
      </div>

      {/* Hero Movie Presentation Header */}
      <section className="relative overflow-hidden mt-4 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Poster column */}
            <div className="md:col-span-4 lg:col-span-3">
              <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Info column */}
            <div className="md:col-span-8 lg:col-span-9 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-rose-500 uppercase tracking-wider">{movie.status}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{movie.genre.join(', ')}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{movie.language.join(', ')}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                  {movie.title}
                </h1>
              </div>

              {/* Quick stats strip (Anti-Slop clean unboxed figures) */}
              <div className="flex flex-wrap items-center gap-6 py-3 border-y border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-mono text-sm tabular-nums">{movie.rating.toFixed(1)}</span>
                  <span className="text-slate-500 font-normal">/ 10</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="font-mono tabular-nums">{movie.duration} minutes</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Release: {new Date(movie.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
                {movie.director && (
                  <div className="text-slate-300">
                    <span className="text-slate-500">Director: </span>
                    <span className="font-medium text-white">{movie.director}</span>
                  </div>
                )}
              </div>

              {/* Synopsis */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Synopsis</h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                  {movie.description}
                </p>
              </div>

              {/* Cast */}
              {movie.cast && movie.cast.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Starring Cast</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    {movie.cast.map((actor, idx) => (
                      <span key={idx} className="bg-slate-800/80 px-2.5 py-1 rounded-md text-slate-200">
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Showtime Booking Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Select Date & Showtimes</h2>
          <p className="text-xs text-slate-400 mt-1">Pick a convenient date and venue to view live seat availability.</p>
        </div>

        {/* Date Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {dateOptions.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            return (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDate(item.dateStr)}
                className={`flex flex-col items-center justify-center min-w-[90px] py-2.5 px-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {item.dayOfWeek}
                </span>
                <span className="text-sm font-bold font-mono tabular-nums mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Theatres and Showtimes Grid */}
        <div className="space-y-6">
          {theatres.length === 0 ? (
            <div className="bg-slate-900/40 p-8 rounded-xl border border-slate-800 text-center">
              <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No scheduled showtimes found for this date.</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting another date above or check back shortly.</p>
            </div>
          ) : (
            theatres.map((theatre) => {
              // Find showtimes at this theatre for selected date
              const theatreShowtimes = filteredShowtimes.filter((s) => s.theatreId === theatre._id);

              return (
                <div
                  key={theatre._id}
                  className="bg-slate-900/60 rounded-xl border border-slate-800 p-6 space-y-4"
                >
                  {/* Theatre Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{theatre.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{theatre.address}</span>
                      </div>
                    </div>
                    {theatre.amenities && theatre.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-400">
                        {theatre.amenities.slice(0, 3).map((a, i) => (
                          <span key={i} className="text-slate-400">
                            {a}{i < 2 && i < theatre.amenities.length - 1 ? ' ·' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Showtimes listing */}
                  {theatreShowtimes.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2 italic">
                      No showtimes available at this venue on {selectedDate}.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {theatreShowtimes.map((st) => {
                        const screen = theatre.screens?.find((s) => s._id === st.screenId);
                        return (
                          <button
                            key={st._id}
                            onClick={() => navigate(`/showtimes/${st._id}/seats`)}
                            className="group flex flex-col items-center justify-center p-3 rounded-lg border border-slate-800 bg-slate-950 hover:border-rose-500 hover:bg-slate-900 transition-all text-center"
                          >
                            <span className="text-base font-bold text-white group-hover:text-rose-400 font-mono tabular-nums">
                              {st.startTime}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                              {screen?.screenType || 'Screen'}
                            </span>
                            <span className="text-[11px] font-semibold text-rose-400/90 font-mono tabular-nums mt-1">
                              From ${st.ticketPrice}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
