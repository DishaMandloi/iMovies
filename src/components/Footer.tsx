import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Shield, Clock, Award } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & mission */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-rose-600 flex items-center justify-center text-white">
                <Film className="w-4 h-4" />
              </div>
              <span className="font-['Outfit'] font-black tracking-wider text-xl text-white">
                IMOVIES
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              The premier digital destination for cinema enthusiasts. Experience instant seat reservation with real-time seat locks, 4K IMAX scheduling, and hassle-free movie ticketing.
            </p>
            <div className="flex items-center gap-6 pt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                Atomic Concurrency Protection
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-400" />
                10-Minute Seat Locks
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                IMAX & Atmos Ready
              </span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-200 mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/movies" className="hover:text-white transition-colors">
                  Now Showing
                </Link>
              </li>
              <li>
                <Link to="/movies?status=upcoming" className="hover:text-white transition-colors">
                  Upcoming Premieres
                </Link>
              </li>
              <li>
                <Link to="/my-bookings" className="hover:text-white transition-colors">
                  Booking History
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Member Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Demo info & Admin */}
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-200 mb-3">
              Platform & Testing
            </h4>
            <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <p>
                <strong className="text-slate-300">Simulated Checkout:</strong> This platform uses a sandbox checkout flow for demonstration purposes. No real credit card details are charged.
              </p>
              <div className="pt-2 border-t border-slate-900">
                <p className="text-slate-500">
                  Admin Demo: <span className="text-slate-300 font-mono">admin@imovies.com</span> / <span className="text-slate-300 font-mono">admin123</span>
                </p>
                <p className="text-slate-500">
                  User Demo: <span className="text-slate-300 font-mono">user@imovies.com</span> / <span className="text-slate-300 font-mono">user123</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} IMovies Entertainment Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Cinema Safety Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
