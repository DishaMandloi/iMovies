import React from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { LayoutDashboard, Film, Building2, Monitor, Clock, Ticket, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { apiRequest } from '../../services/api.js';

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();
  const [resetting, setResetting] = React.useState(false);
  const [resetMsg, setResetMsg] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-400">Verifying administrative credentials...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ returnUrl: '/admin' }} />;
  }

  const handleResetSeed = async () => {
    if (!window.confirm('Reset database to pristine seed data? This will restore original demo movies, theatres, and clear recent mock locks.')) {
      return;
    }
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/admin/reset-seed', {
        method: 'POST',
      });
      if (res.success) {
        setResetMsg('Database successfully reset. Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err: any) {
      setResetMsg('Error resetting database: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  const navLinks = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/movies', label: 'Movies', icon: Film },
    { to: '/admin/theatres', label: 'Theatres', icon: Building2 },
    { to: '/admin/screens', label: 'Screens', icon: Monitor },
    { to: '/admin/showtimes', label: 'Showtimes', icon: Clock },
    { to: '/admin/bookings', label: 'Bookings', icon: Ticket },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-h-screen">
      {/* Admin Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Admin Console
            </span>
            <span className="text-xs text-slate-400">IMovies Cinema Operations</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Cinema Management Studio
          </h1>
        </div>

        <button
          onClick={handleResetSeed}
          disabled={resetting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>Reset Sample Data</span>
        </button>
      </div>

      {resetMsg && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs">
          {resetMsg}
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none text-xs">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Child Admin Views */}
      <Outlet />
    </div>
  );
};
