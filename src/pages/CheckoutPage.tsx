import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, Ticket, Clock, AlertTriangle, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../services/api.js';

interface CheckoutLocationState {
  showtimeId: string;
  movie: {
    _id: string;
    title: string;
    posterUrl: string;
    duration: number;
  };
  theatre: {
    _id: string;
    name: string;
    address: string;
  };
  screen: {
    _id: string;
    name: string;
    screenType: string;
  };
  showtime: {
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
    basePrice: number;
  };
  selectedSeats: Array<{
    seatNumber: string;
    tier: 'Standard' | 'Premium' | 'VIP';
    price: number;
  }>;
  totalAmount: number;
  lockExpiresAt: number | null;
}

export const CheckoutPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const state = location.state as CheckoutLocationState | undefined;

  // Form states
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet' | 'upi'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync user info if user logs in
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  // If no state was passed, redirect back
  if (!state || !state.selectedSeats || state.selectedSeats.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Active Checkout Session</h2>
        <p className="text-xs text-slate-400">Please select a movie and seats to initiate checkout.</p>
        <Link to="/movies" className="inline-block px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 rounded-lg">
          Browse Movies
        </Link>
      </div>
    );
  }

  const { movie, theatre, screen, showtime, selectedSeats } = state;
  const subtotal = selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const bookingFee = Math.round(selectedSeats.length * 1.5 * 100) / 100;
  const grandTotal = subtotal + bookingFee;

  const handleQuickFillCard = () => {
    setCardNumber('4532 •••• •••• 8824');
    setCardExpiry('12/28');
    setCardCvv('789');
    setCustomerName(user?.name || 'Alex Mercer');
    setCustomerEmail(user?.email || 'user@imovies.com');
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthenticated) {
      navigate('/login', { state: { returnUrl: '/checkout', checkoutState: state } });
      return;
    }

    if (!customerName || !customerEmail) {
      setErrorMessage('Please fill in your name and email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        booking: {
          _id: string;
          bookingReference: string;
        };
      }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          showtimeId: showtime._id,
          seats: selectedSeats.map((s) => ({
            seatNumber: s.seatNumber,
            tier: s.tier,
            price: s.price,
          })),
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          paymentDetails: {
            method: paymentMethod,
            cardLast4: '8824',
          },
        }),
      });

      if (res.success && res.booking) {
        navigate(`/booking-confirmation/${res.booking._id}`, {
          state: { bookingId: res.booking._id, bookingReference: res.booking.bookingReference },
        });
      }
    } catch (err: any) {
      console.error('Booking confirmation failed:', err);
      setErrorMessage(err.message || 'Booking failed. Your seat lock may have expired or a conflict occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={`/showtimes/${showtime._id}/seats`}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Checkout & Order Review
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Confirm your seat reservations and complete your simulated purchase.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">
            <strong className="block font-semibold">Reservation Error</strong>
            <span>{errorMessage}</span>
          </div>
          <Link
            to={`/showtimes/${showtime._id}/seats`}
            className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-semibold whitespace-nowrap"
          >
            Re-select Seats
          </Link>
        </div>
      )}

      {/* Grid: Order Summary vs Payment Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Payment & Guest Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Auth banner if not logged in */}
          {!isAuthenticated && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-4">
              <div className="text-xs text-amber-200">
                <strong className="block font-semibold">Sign in required to finalize booking</strong>
                <span className="text-amber-300/80">Log in or create a quick account so tickets appear in your history.</span>
              </div>
              <Link
                to="/login"
                state={{ returnUrl: '/checkout', checkoutState: state }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shrink-0 transition-colors"
              >
                Sign In Now
              </Link>
            </div>
          )}

          {/* Contact Details */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              1. Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. alex@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Section (Simulated) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                2. Simulated Payment Method
              </h3>
              <button
                type="button"
                onClick={handleQuickFillCard}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium underline"
              >
                Auto-fill Demo Card
              </button>
            </div>

            {/* Demo Notice Banner */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Sandbox Mode:</strong> Testing simulation only. Do NOT enter real credit card numbers.
              </span>
            </div>

            {/* Payment Tabs */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  paymentMethod === 'wallet'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Cinema Wallet
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  paymentMethod === 'upi'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                UPI / Net Banking
              </button>
            </div>

            {/* Card Inputs */}
            <form onSubmit={handleConfirmBooking} className="space-y-4 pt-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Demo Card Number</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="4532 8824 9912 3341"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">Expiry Date (MM/YY)</label>
                  <input
                    type="text"
                    required
                    placeholder="12/28"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5 font-medium">CVV / CVC</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    placeholder="•••"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? 'bg-rose-800 cursor-wait'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30 cursor-pointer active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying & Allocating Seats...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Complete Booking (${grandTotal.toFixed(2)})</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl sticky top-24">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-3">
              Order Summary
            </h3>

            {/* Movie preview snippet */}
            <div className="flex gap-4 items-center">
              <div className="w-16 h-22 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white line-clamp-1">{movie.title}</h4>
                <p className="text-xs text-slate-400">{theatre.name}</p>
                <div className="text-[11px] text-slate-500">
                  <span>{screen.name}</span> · <span className="font-mono tabular-nums">{showtime.date} ({showtime.startTime})</span>
                </div>
              </div>
            </div>

            {/* Selected Seats detail */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <div className="text-xs font-semibold text-slate-300">Reserved Seats</div>
              <div className="space-y-1.5">
                {selectedSeats.map((s) => (
                  <div key={s.seatNumber} className="flex justify-between text-xs text-slate-400">
                    <span>
                      Seat <strong className="text-white font-mono">{s.seatNumber}</strong> ({s.tier})
                    </span>
                    <span className="font-mono tabular-nums text-slate-200">${s.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee calculation breakdown */}
            <div className="space-y-2 border-t border-slate-800 pt-4 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal ({selectedSeats.length} tickets)</span>
                <span className="font-mono tabular-nums text-slate-200">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cinema Convenience Fee</span>
                <span className="font-mono tabular-nums text-slate-200">${bookingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-3 text-sm font-bold text-white">
                <span>Total Amount</span>
                <span className="text-rose-400 font-mono tabular-nums text-lg">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Trust badge */}
            <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full cancellation and refund permitted up to 2 hours prior to showtime.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
