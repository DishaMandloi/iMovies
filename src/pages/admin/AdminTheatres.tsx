import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Building2, MapPin, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../services/api.js';
import { Theatre } from '../../../server/types.js';

interface TheatreWithScreens extends Theatre {
  screens: any[];
  totalScreens: number;
}

export const AdminTheatres: React.FC = () => {
  const [theatres, setTheatres] = useState<TheatreWithScreens[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTheatre, setEditingTheatre] = useState<Theatre | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Metropolis');
  const [amenities, setAmenities] = useState('');
  const [phone, setPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchTheatres = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; theatres: TheatreWithScreens[] }>('/api/theatres');
      if (res.success) setTheatres(res.theatres);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load theatres.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTheatres();
  }, []);

  const openCreateModal = () => {
    setEditingTheatre(null);
    setName('');
    setAddress('');
    setCity('Metropolis');
    setAmenities('IMAX 4K Laser, Dolby Atmos, Luxury Recliners');
    setPhone('+1 (555) 123-4567');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: Theatre) => {
    setEditingTheatre(t);
    setName(t.name);
    setAddress(t.address);
    setCity(t.city);
    setAmenities(t.amenities.join(', '));
    setPhone(t.phone);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      name,
      address,
      city,
      amenities: amenities.split(',').map((a) => a.trim()).filter(Boolean),
      phone,
    };

    try {
      if (editingTheatre) {
        const res = await apiRequest<{ success: boolean; message: string }>(
          `/api/theatres/${editingTheatre._id}`,
          { method: 'PUT', body: JSON.stringify(payload) }
        );
        if (res.success) {
          setSuccessMsg('Theatre updated successfully.');
          setIsModalOpen(false);
          fetchTheatres();
        }
      } else {
        const res = await apiRequest<{ success: boolean; message: string }>(
          '/api/theatres',
          { method: 'POST', body: JSON.stringify(payload) }
        );
        if (res.success) {
          setSuccessMsg('Theatre created successfully.');
          setIsModalOpen(false);
          fetchTheatres();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed.');
    }
  };

  const handleDelete = async (t: Theatre) => {
    if (!window.confirm(`Are you sure you want to delete theatre "${t.name}"? This will also remove its auditoriums and showtimes.`)) {
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/theatres/${t._id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setSuccessMsg(res.message);
        fetchTheatres();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot delete theatre.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Cinema Venues</h2>
          <p className="text-xs text-slate-400">Configure cineplex branches and guest amenities.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Theatre</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {theatres.map((t) => (
          <div key={t._id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-800 rounded-lg text-rose-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{t.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{t.totalScreens} Auditoriums</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(t)}
                  className="p-1.5 text-slate-400 hover:text-white rounded"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{t.address}, {t.city}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{t.phone}</span>
              </div>
            </div>

            {t.amenities && t.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                {t.amenities.map((a, i) => (
                  <span key={i} className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingTheatre ? 'Edit Theatre' : 'Add New Cinema Theatre'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Theatre Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. IMAX Grand Cineplex"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 742 Metropolis Grand Boulevard"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Amenities (comma separated)</label>
                <input
                  type="text"
                  value={amenities}
                  onChange={(e) => setAmenities(e.target.value)}
                  placeholder="IMAX 4K Laser, Recliners, Gourmet Bar"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
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
                  Save Theatre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
