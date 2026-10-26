import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X, Monitor, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { Screen, Theatre } from '../../../server/types.js';

export const AdminScreens: React.FC = () => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [theatreId, setTheatreId] = useState('');
  const [name, setName] = useState('');
  const [screenType, setScreenType] = useState<'IMAX' | 'Dolby Atmos' | 'Standard 4K' | 'VIP Lounge'>('Standard 4K');
  const [rowCount, setRowCount] = useState('6');
  const [seatsPerRow, setSeatsPerRow] = useState('12');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [theatresRes, showtimesRes] = await Promise.all([
        apiRequest<{ success: boolean; theatres: any[] }>('/api/theatres'),
        apiRequest<{ success: boolean; showtimes: any[] }>('/api/showtimes'),
      ]);

      if (theatresRes.success) {
        setTheatres(theatresRes.theatres);
        const allScreens: Screen[] = [];
        theatresRes.theatres.forEach((t) => {
          if (t.screens) allScreens.push(...t.screens);
        });
        setScreens(allScreens);
        if (theatresRes.theatres.length > 0) {
          setTheatreId(theatresRes.theatres[0]._id);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load screens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiRequest<{ success: boolean; message: string; screen: Screen }>('/api/screens', {
        method: 'POST',
        body: JSON.stringify({
          theatreId,
          name,
          screenType,
          rowCount: Number(rowCount),
          seatsPerRow: Number(seatsPerRow),
        }),
      });

      if (res.success) {
        setSuccessMsg(`Screen "${name}" created with ${res.screen.totalSeats} seats.`);
        setIsModalOpen(false);
        setName('');
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create screen.');
    }
  };

  const handleDeleteScreen = async (screen: Screen) => {
    if (!window.confirm(`Delete screen "${screen.name}"? This will cancel any showtimes scheduled on this screen.`)) {
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/screens/${screen._id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setSuccessMsg(res.message);
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot delete screen.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Auditoriums & Screen Layouts</h2>
          <p className="text-xs text-slate-400">Configure screen capacities, row counts, and projection formats.</p>
        </div>

        <button
          onClick={() => {
            setName('Auditorium ' + (screens.length + 1));
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Auditorium</span>
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
              <th className="py-3 px-4">Screen Name</th>
              <th className="py-3 px-4">Theatre Venue</th>
              <th className="py-3 px-4">Technology Format</th>
              <th className="py-3 px-4">Seat Grid Structure</th>
              <th className="py-3 px-4">Total Seats</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {screens.map((sc) => {
              const theatre = theatres.find((t) => t._id === sc.theatreId);
              return (
                <tr key={sc._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-white font-sans">{sc.name}</td>
                  <td className="py-3 px-4 font-sans text-slate-300">{theatre?.name || 'Unknown'}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                      {sc.screenType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {sc.seatLayout.rows.length} Rows (A-{sc.seatLayout.rows[sc.seatLayout.rows.length - 1]}) × {sc.seatLayout.seatsPerRow} Seats
                  </td>
                  <td className="py-3 px-4 text-white font-bold tabular-nums">{sc.totalSeats} seats</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteScreen(sc)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
                      title="Delete screen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create New Auditorium</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScreen} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Theatre</label>
                <select
                  value={theatreId}
                  onChange={(e) => setTheatreId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                >
                  {theatres.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Screen Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Auditorium 4 – Laser 4K"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Technology Format</label>
                <select
                  value={screenType}
                  onChange={(e: any) => setScreenType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="IMAX">IMAX 4K Laser</option>
                  <option value="Dolby Atmos">Dolby Atmos Surround</option>
                  <option value="Standard 4K">Standard 4K Digital</option>
                  <option value="VIP Lounge">VIP Lounge Recliner</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rows Count</label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={rowCount}
                    onChange={(e) => setRowCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Rows A to {String.fromCharCode(64 + Number(rowCount))}</span>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Seats per Row</label>
                  <input
                    type="number"
                    min="6"
                    max="18"
                    value={seatsPerRow}
                    onChange={(e) => setSeatsPerRow(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Total: {Number(rowCount) * Number(seatsPerRow)} seats</span>
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
                  Create Screen Layout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
