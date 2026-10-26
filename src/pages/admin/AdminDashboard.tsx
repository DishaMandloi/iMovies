import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Ticket, Film, Clock, Users, ShieldAlert, ArrowUpRight, Plus } from 'lucide-react';
import { apiRequest } from '../../services/api.js';

interface AdminStats {
  totalMovies: number;
  currentlyShowingMovies: number;
  upcomingMovies: number;
  totalTheatres: number;
  totalScreens: number;
  totalShowtimes: number;
  totalBookings: number;
  confirmedBookingsCount: number;
  cancelledBookingsCount: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalUsers: number;
  activeLocks: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          apiRequest<{ success: boolean; stats: AdminStats }>('/api/admin/stats'),
          apiRequest<{ success: boolean; bookings: any[] }>('/api/admin/bookings?limit=5'),
        ]);

        if (statsRes.success) setStats(statsRes.stats);
        if (bookingsRes.success) setRecentBookings(bookingsRes.bookings);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-400">Loading cinema analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Box Office Gross</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            ${stats?.totalRevenue.toFixed(2) || '0.00'}
          </div>
          <p className="text-[11px] text-slate-500">From confirmed digital reservations</p>
        </div>

        {/* Tickets Sold */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Tickets Reserved</span>
            <Ticket className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            {stats?.totalTicketsSold || 0}
          </div>
          <p className="text-[11px] text-slate-500">Across {stats?.totalShowtimes || 0} active showtimes</p>
        </div>

        {/* Movies */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Films in Rotation</span>
            <Film className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            {stats?.totalMovies || 0}
          </div>
          <p className="text-[11px] text-slate-500">
            {stats?.currentlyShowingMovies || 0} showing · {stats?.upcomingMovies || 0} upcoming
          </p>
        </div>

        {/* Venues & Screens */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Auditoriums</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono tabular-nums">
            {stats?.totalScreens || 0}
          </div>
          <p className="text-[11px] text-slate-500">In {stats?.totalTheatres || 0} cinema complexes</p>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/admin/movies"
          className="p-4 bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between group transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-rose-400">Add New Movie</span>
              <span className="text-[11px] text-slate-400">Upload metadata and posters</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
        </Link>

        <Link
          to="/admin/showtimes"
          className="p-4 bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between group transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-amber-400">Schedule Showtime</span>
              <span className="text-[11px] text-slate-400">Assign films to auditoriums</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
        </Link>

        <Link
          to="/admin/theatres"
          className="p-4 bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between group transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block group-hover:text-purple-400">Manage Complex</span>
              <span className="text-[11px] text-slate-400">Theatres, screens & recliners</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
        </Link>
      </div>

      {/* Recent Bookings Feed */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Recent Admissions & Bookings
          </h3>
          <Link to="/admin/bookings" className="text-xs text-amber-400 hover:underline">
            View All ({stats?.totalBookings || 0})
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No bookings recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Movie & Theatre</th>
                  <th className="py-2.5 px-3">Seats</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recentBookings.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">{b.bookingReference}</td>
                    <td className="py-3 px-3 font-sans">
                      <div className="font-medium text-white">{b.customerName}</div>
                      <div className="text-[10px] text-slate-500">{b.customerEmail}</div>
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="text-white">{b.movieTitle}</div>
                      <div className="text-[10px] text-slate-500">{b.theatreName}</div>
                    </td>
                    <td className="py-3 px-3">
                      {b.seats.map((s: any) => s.seatNumber).join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-white">
                      ${b.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase ${
                          b.bookingStatus === 'confirmed'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {b.bookingStatus}
                      </span>
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
