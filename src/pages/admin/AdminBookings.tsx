import React, { useEffect, useState } from 'react';
import { Search, Ban, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import { apiRequest } from '../../services/api.js';

export const AdminBookings: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (status !== 'all') q.set('status', status);

      const res = await apiRequest<{ success: boolean; bookings: any[] }>(
        `/api/admin/bookings?${q.toString()}`
      );
      if (res.success) setBookings(res.bookings);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to retrieve bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBookings();
  };

  const handleCancelBooking = async (b: any) => {
    if (!window.confirm(`Cancel reservation ${b.bookingReference} for ${b.customerName}?`)) {
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        `/api/bookings/${b._id}/cancel`,
        { method: 'PATCH' }
      );
      if (res.success) {
        setSuccessMsg(res.message);
        fetchBookings();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Cannot cancel booking.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Guest Reservations & Ticketing</h2>
          <p className="text-xs text-slate-400">Search customer tickets, check admission codes, and manage refunds.</p>
        </div>

        {/* Search & filter */}
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 w-56"
            />
          </form>
        </div>
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
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading booking records...</div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">No bookings match the search criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Film & Theatre</th>
                  <th className="py-3 px-4">Showtime</th>
                  <th className="py-3 px-4">Allocated Seats</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white tracking-wider">{b.bookingReference}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-white">{b.customerName}</div>
                      <div className="text-[11px] text-slate-500">{b.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-white">{b.movieTitle}</div>
                      <div className="text-[11px] text-slate-400">{b.theatreName} ({b.screenName})</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{b.showDate}</div>
                      <div className="text-[11px] text-rose-400">{b.showStartTime}</div>
                    </td>
                    <td className="py-3 px-4">
                      {b.seats.map((s: any) => s.seatNumber).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-white tabular-nums">
                      ${b.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase ${
                          b.bookingStatus === 'confirmed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {b.bookingStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.bookingStatus === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(b)}
                          className="px-2.5 py-1 text-slate-400 hover:text-rose-400 rounded text-[11px] font-sans transition-colors cursor-pointer"
                          title="Cancel Reservation & Refund"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
