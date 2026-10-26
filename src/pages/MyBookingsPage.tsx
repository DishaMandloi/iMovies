import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, Clock, MapPin, AlertCircle, Ban, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../services/api.js';

interface BookingRecord {
  _id: string;
  bookingReference: string;
  movieId: string;
  theatreId: string;
  screenId: string;
  showtimeId: string;
  seats: Array<{ seatNumber: string; tier: string; price: number }>;
  totalAmount: number;
  paymentStatus: string;
  bookingStatus: 'confirmed' | 'cancelled';
  createdAt: string;
  movieTitle: string;
  moviePoster: string;
  theatreName: string;
  theatreAddress: string;
  screenName: string;
  showDate: string;
  showStartTime: string;
  showEndTime: string;
}

export const MyBookingsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; bookings: BookingRecord[] }>('/api/bookings/my');
      if (res.success) {
        setBookings(res.bookings);
      }
    } catch (err: any) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking? A full refund will be processed and the seats will be released.')) {
      return;
    }

    setCancellingId(bookingId);
    setMessage(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        `/api/bookings/${bookingId}/cancel`,
        { method: 'PATCH' }
      );
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
        await fetchBookings();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to cancel booking.' });
    } finally {
      setCancellingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Sign In to View Your Bookings</h2>
        <p className="text-xs text-slate-400">Please authenticate to access your cinema passes and reservation history.</p>
        <Link to="/login" state={{ returnUrl: '/my-bookings' }} className="inline-block px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-white tracking-tight">My Cinema Bookings</h1>
        <p className="text-xs text-slate-400 mt-1">Review your tickets, view gate passes, or manage cancellations.</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs text-slate-400">Loading booking records...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-20 text-center p-8 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Tickets Booked Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don't have any movie tickets in your history. Browse our now showing movies to reserve seats.
          </p>
          <Link
            to="/movies"
            className="inline-block mt-2 px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-md shadow-rose-600/30"
          >
            Explore Movies
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isCancelled = booking.bookingStatus === 'cancelled';
            const showDateTime = new Date(`${booking.showDate}T${booking.showStartTime}:00`);
            const isPast = showDateTime.getTime() < Date.now();

            return (
              <div
                key={booking._id}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 sm:p-6 transition-all hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Booking Ref:</span>
                    <span className="font-mono font-bold text-white text-sm tracking-wider">
                      {booking.bookingReference}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        isCancelled
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {booking.bookingStatus.toUpperCase()}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500">
                    Booked on {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 items-center">
                  {/* Poster */}
                  <div className="w-16 h-22 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-700 hidden sm:block md:col-span-2">
                    <img
                      src={booking.moviePoster}
                      alt={booking.movieTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Movie details */}
                  <div className="md:col-span-6 space-y-2">
                    <h3 className="text-lg font-bold text-white">{booking.movieTitle}</h3>
                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        {booking.theatreName} ({booking.screenName})
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {booking.showDate}
                      </span>
                      <span className="flex items-center gap-1 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {booking.showStartTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 text-xs text-slate-400">
                      <span>Seats:</span>
                      {booking.seats.map((s) => (
                        <span
                          key={s.seatNumber}
                          className="px-1.5 py-0.5 bg-slate-800 rounded font-mono font-bold text-slate-200 text-[11px]"
                        >
                          {s.seatNumber}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Total & Actions */}
                  <div className="md:col-span-4 flex flex-col md:items-end justify-between gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Paid</span>
                      <span className="text-lg font-black text-white font-mono tabular-nums">
                        ${booking.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/booking-confirmation/${booking._id}`}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <span>View Pass</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      {!isCancelled && !isPast && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          disabled={cancellingId === booking._id}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
