import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X, Clock, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { Showtime, Movie, Theatre, Screen } from '../../../server/types.js';

interface EnrichedShowtime extends Showtime {
  movieTitle: string;
  movieDuration: number;
  theatreName: string;
  screenName: string;
  screenType: string;
}

export const AdminShowtimes: React.FC = () => {
  const [showtimes, setShowtimes] = useState<EnrichedShowtime[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedTheatreId, setSelectedTheatreId] = useState('');
  const [selectedScreenId, setSelectedScreenId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:30');
  const [ticketPrice, setTicketPrice] = useState('16');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stRes, movRes, thRes] = await Promise.all([
        apiRequest<{ success: boolean; showtimes: EnrichedShowtime[] }>('/api/showtimes'),
        apiRequest<{ success: boolean; movies: Movie[] }>('/api/movies'),
        apiRequest<{ success: boolean; theatres: any[] }>('/api/theatres'),
      ]);

      if (stRes.success) setShowtimes(stRes.showtimes);
      if (movRes.success) {
        setMovies(movRes.movies);
        if (movRes.movies.length > 0) setSelectedMovieId(movRes.movies[0]._id);
      }
      if (thRes.success) {
        setTheatres(thRes.theatres);
        const allSc: Screen[] = [];
        thRes.theatres.forEach((t) => {
          if (t.screens) allSc.push(...t.screens);
        });
        setScreens(allSc);
        if (thRes.theatres.length > 0) {
          setSelectedTheatreId(thRes.theatres[0]._id);
          const firstThScreens = allSc.filter((s) => s.theatreId === thRes.theatres[0]._id);
          if (firstThScreens.length > 0) {
            setSelectedScreenId(firstThScreens[0]._id);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load showtime data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update screen selection when theatre changes
  const handleTheatreChange = (thId: string) => {
    setSelectedTheatreId(thId);
    const thScreens = screens.filter((s) => s.theatreId === thId);
    if (thScreens.length > 0) {
      setSelectedScreenId(thScreens[0]._id);
    } else {
      setSelectedScreenId('');
    }
  };

  // Auto calculate end time when movie or start time changes
  useEffect(() => {
    const movie = movies.find((m) => m._id === selectedMovieId);
    if (movie && startTime) {
      const [h, m] = startTime.split(':').map(Number);
      const startMin = h * 60 + (m || 0);
      const totalMin = startMin + movie.duration + 20; // 20 min buffer for previews & cleaning
      const endH = Math.floor(totalMin / 60) % 24;
      const endM = totalMin % 60;
      setEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
    }
  }, [selectedMovieId, startTime, movies]);

  const handleCreateShowtime = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedScreenId) {
      setErrorMsg('Please select a valid auditorium screen.');
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/showtimes', {
        method: 'POST',
        body: JSON.stringify({
          movieId: selectedMovieId,
          theatreId: selectedTheatreId,
          screenId: selectedScreenId,
          date,
          startTime,
          endTime,
          ticketPrice: Number(ticketPrice),
        }),
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to schedule showtime.');
    }
  };

  const handleDeleteShowtime = async (st: EnrichedShowtime) => {
    if (!window.confirm(`Delete showtime for "${st.movieTitle}" on ${st.date} at ${st.startTime}?`)) {
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/showtimes/${st._id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setSuccessMsg(res.message);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot delete showtime.');
    }
  };

  const currentTheatreScreens = screens.filter((s) => s.theatreId === selectedTheatreId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Showtime Scheduling</h2>
          <p className="text-xs text-slate-400">Schedule movies into auditorium screens with conflict prevention.</p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Showtime</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Movie</th>
              <th className="py-3 px-4">Theatre & Screen</th>
              <th className="py-3 px-4">Base Ticket</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {showtimes.map((st) => (
              <tr key={st._id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-white font-mono">{st.date}</div>
                  <div className="text-[11px] text-rose-400 font-mono font-semibold">{st.startTime} – {st.endTime}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-white">{st.movieTitle}</div>
                  <div className="text-[11px] text-slate-500">{st.movieDuration} min runtime</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-white">{st.theatreName}</div>
                  <div className="text-[11px] text-slate-400">{st.screenName} ({st.screenType})</div>
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-white font-bold">
                  ${st.ticketPrice.toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {st.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleDeleteShowtime(st)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                    title="Delete showtime"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Schedule Movie Showtime</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShowtime} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Movie</label>
                <select
                  value={selectedMovieId}
                  onChange={(e) => setSelectedMovieId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                >
                  {movies.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.title} ({m.duration} mins)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Theatre</label>
                  <select
                    value={selectedTheatreId}
                    onChange={(e) => handleTheatreChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  >
                    {theatres.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Auditorium / Screen</label>
                  <select
                    value={selectedScreenId}
                    onChange={(e) => setSelectedScreenId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  >
                    {currentTheatreScreens.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.screenType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    min="5"
                    step="0.5"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white rounded-lg font-semibold"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
