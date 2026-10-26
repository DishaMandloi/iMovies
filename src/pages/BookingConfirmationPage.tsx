import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Ticket, Printer, ArrowRight, MapPin, Calendar, Clock, Film } from 'lucide-react';
import { apiRequest } from '../services/api.js';

interface BookingDetails {
  _id: string;
  bookingReference: string;
  userId: string;
  movieId: string;
  theatreId: string;
  screenId: string;
  showtimeId: string;
  seats: Array<{ seatNumber: string; tier: string; price: number }>;
  totalAmount: number;
  paymentStatus: string;
  bookingStatus: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  movieTitle: string;
  moviePoster: string;
  theatreName: string;
  theatreAddress: string;
  screenName: string;
  screenType: string;
  showDate: string;
  showStartTime: string;
  showEndTime: string;
}

export const BookingConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      if (!id) return;
      try {
        const res = await apiRequest<{ success: boolean; booking: BookingDetails }>(
          `/api/bookings/${id}`
        );
        if (res.success && res.booking) {
          setBooking(res.booking);
        } else {
          setError('Unable to load booking details.');
        }
      } catch (err: any) {
        setError(err.message || 'Booking not found.');
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-400">Loading your cinema pass...</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <Film className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Booking Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'Could not locate this ticket reservation.'}</p>
        <Link to="/my-bookings" className="inline-block px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 rounded-lg">
          View My Bookings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 min-h-screen">
      {/* Success banner */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Reservation Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Your tickets have been allocated. Present the digital pass below at the auditorium entrance.
        </p>
      </div>

      {/* Digital Cinema Ticket Stub */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-rose-700 to-rose-600 p-6 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Ticket className="w-6 h-6 text-white" />
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-200">
                Official Admission Pass
              </span>
              <div className="font-mono text-xl font-black tracking-widest">
                {booking.bookingReference}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase text-rose-200">Payment Status</span>
            <div className="text-sm font-bold uppercase tracking-wide">
              CONFIRMED (PAID)
            </div>
          </div>
        </div>

        {/* Perforated divider line simulation */}
        <div className="relative border-b-2 border-dashed border-slate-800 my-0">
          <div className="absolute -left-3 -top-3 w-6 h-6 bg-slate-950 rounded-full" />
          <div className="absolute -right-3 -top-3 w-6 h-6 bg-slate-950 rounded-full" />
        </div>

        {/* Ticket Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Poster */}
            <div className="w-24 sm:w-28 aspect-[3/4] rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
              <img
                src={booking.moviePoster}
                alt={booking.movieTitle}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Movie & Venue Info */}
            <div className="space-y-3 flex-1">
              <div>
                <h3 className="text-xl font-black text-white">{booking.movieTitle}</h3>
                <p className="text-xs text-rose-400 font-semibold">{booking.screenType || 'Digital 4K'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-white">{booking.theatreName}</strong>
                    <span className="text-slate-400 text-[11px]">{booking.theatreAddress}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="block text-white">Date & Showtime</strong>
                    <span className="font-mono tabular-nums text-slate-400">
                      {booking.showDate} at {booking.showStartTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reserved Seats Band */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                Auditorium & Seats ({booking.seats.length} Tickets)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-slate-300">{booking.screenName}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {booking.seats.map((s) => (
                    <span
                      key={s.seatNumber}
                      className="px-2 py-0.5 rounded bg-rose-600/20 border border-rose-500/40 text-xs font-mono font-bold text-rose-300"
                    >
                      {s.seatNumber} ({s.tier})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Total Amount</span>
              <span className="text-lg font-black text-white font-mono tabular-nums">
                ${booking.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer & Barcode Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <div>
              <span>Booked by: </span>
              <strong className="text-white">{booking.customerName}</strong>
              <span className="block text-slate-500 text-[11px]">{booking.customerEmail}</span>
            </div>

            {/* Barcode / Scan representation */}
            <div className="flex flex-col items-center gap-1">
              <div className="h-10 flex items-center gap-1 bg-white p-2 rounded">
                {/* Simulated barcode stripes */}
                {[2, 4, 1, 3, 2, 5, 2, 1, 4, 2, 3, 1, 4, 2].map((w, i) => (
                  <div
                    key={i}
                    style={{ width: `${w * 2}px` }}
                    className="h-full bg-slate-950"
                  />
                ))}
              </div>
              <span className="text-[9px] font-mono tracking-widest uppercase text-slate-500">
                GATE PASS VERIFIED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print or Save Pass</span>
        </button>

        <Link
          to="/my-bookings"
          className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-md shadow-rose-600/30"
        >
          <span>View in Booking History</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
