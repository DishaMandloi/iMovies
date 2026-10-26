import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Star, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { Movie } from '../../../server/types.js';

export const AdminMovies: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [duration, setDuration] = useState('120');
  const [rating, setRating] = useState('8.5');
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [cast, setCast] = useState('');
  const [director, setDirector] = useState('');
  const [status, setStatus] = useState<'currently showing' | 'upcoming'>('currently showing');

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; movies: Movie[] }>('/api/movies');
      if (res.success) setMovies(res.movies);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load movies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  const openCreateModal = () => {
    setEditingMovie(null);
    setTitle('');
    setDescription('');
    setPosterUrl('/src/assets/images/poster_neon_detective_1792995198830.jpg');
    setGenre('Sci-Fi, Action');
    setLanguage('English');
    setDuration('120');
    setRating('8.5');
    setReleaseDate(new Date().toISOString().split('T')[0]);
    setCast('');
    setDirector('');
    setStatus('currently showing');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: Movie) => {
    setEditingMovie(m);
    setTitle(m.title);
    setDescription(m.description);
    setPosterUrl(m.posterUrl);
    setGenre(m.genre.join(', '));
    setLanguage(m.language.join(', '));
    setDuration(String(m.duration));
    setRating(String(m.rating));
    setReleaseDate(m.releaseDate);
    setCast(m.cast.join(', '));
    setDirector(m.director || '');
    setStatus(m.status);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      title,
      description,
      posterUrl,
      genre: genre.split(',').map((g) => g.trim()),
      language: language.split(',').map((l) => l.trim()),
      duration: Number(duration),
      rating: Number(rating),
      releaseDate,
      cast: cast.split(',').map((c) => c.trim()).filter(Boolean),
      director,
      status,
    };

    try {
      if (editingMovie) {
        const res = await apiRequest<{ success: boolean; message: string }>(
          `/api/movies/${editingMovie._id}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );
        if (res.success) {
          setSuccessMsg('Movie updated successfully.');
          setIsModalOpen(false);
          fetchMovies();
        }
      } else {
        const res = await apiRequest<{ success: boolean; message: string }>('/api/movies', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res.success) {
          setSuccessMsg('Movie created successfully.');
          setIsModalOpen(false);
          fetchMovies();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (m: Movie) => {
    if (!window.confirm(`Are you sure you want to delete movie "${m.title}"?`)) {
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/movies/${m._id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setSuccessMsg(res.message);
        fetchMovies();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot delete movie.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Movie Management</h2>
          <p className="text-xs text-slate-400">Add, update, or remove movies from the theatre catalog.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Movie</span>
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

      {/* Movies Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading movies...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Poster</th>
                  <th className="py-3 px-4">Title & Director</th>
                  <th className="py-3 px-4">Genre / Lang</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Rating</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movies.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="w-10 h-14 rounded bg-slate-950 overflow-hidden border border-slate-700">
                        <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-white text-sm">{m.title}</div>
                      <div className="text-[11px] text-slate-400">Dir: {m.director || 'N/A'}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div>{m.genre.join(', ')}</div>
                      <div className="text-[11px] text-slate-500">{m.language.join(', ')}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">{m.duration} mins</td>
                    <td className="py-2.5 px-4">
                      <span className="flex items-center gap-1 text-amber-400 font-mono font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {m.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          m.status === 'currently showing'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          title="Edit Movie"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="Delete Movie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingMovie ? `Edit Movie: ${editingMovie.title}` : 'Add New Movie to Catalog'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Movie Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Director</label>
                  <input
                    type="text"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Synopsis / Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Poster Image URL or Path</label>
                <input
                  type="text"
                  required
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Genres (comma separated)</label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Sci-Fi, Action, Thriller"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Languages (comma separated)</label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="English, Japanese"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rating (0 - 10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="currently showing">Currently Showing</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Starring Cast (comma separated)</label>
                <input
                  type="text"
                  value={cast}
                  onChange={(e) => setCast(e.target.value)}
                  placeholder="Actor One, Actor Two, Actor Three"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-semibold shadow-md shadow-rose-600/30"
                >
                  {editingMovie ? 'Save Changes' : 'Create Movie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
