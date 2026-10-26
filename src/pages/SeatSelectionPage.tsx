import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, ShieldCheck, Ticket, AlertCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '../services/api.js';

interface SeatItem {
  seatNumber: string;
  row: string;
  number: number;
  tier: 'Standard' | 'Premium' | 'VIP';
  priceMultiplier: number;
  price: number;
  status: 'available' | 'booked' | 'locked' | 'selected';
}

interface ShowtimeSeatResponse {
  success: boolean;
  showtime: {
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
    basePrice: number;
  };
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
    rows: string[];
    seatsPerRow: number;
  };
  totalSeats: number;
  totalAvailable: number;
  totalBooked: number;
  seats: SeatItem[];
}

export const SeatSelectionPage: React.FC = () => {
  const { id: showtimeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [seatData, setSeatData] = useState<ShowtimeSeatResponse | null>(null);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isLocking, setIsLocking] = useState(false);

  // Fetch seat status
  const fetchSeats = useCallback(async (isInitial = false) => {
    if (!showtimeId) return;
    if (isInitial) setLoading(true);

    try {
      const data = await apiRequest<ShowtimeSeatResponse>(`/api/showtimes/${showtimeId}/seats`);
      if (data.success) {
        setSeatData(data);

        // If seats are already locked by this client, initialize selected list
        if (isInitial) {
          const mySelected = data.seats
            .filter((s) => s.status === 'selected')
            .map((s) => s.seatNumber);
          if (mySelected.length > 0) {
            setSelectedSeatNumbers(mySelected);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load seats:', err);
      setErrorMsg(err.message || 'Unable to retrieve seat availability.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [showtimeId]);

  // Initial load
  useEffect(() => {
    fetchSeats(true);
    // Background polling every 8 seconds to keep seat status synchronized
    const interval = setInterval(() => fetchSeats(false), 8000);
    return () => clearInterval(interval);
  }, [fetchSeats]);

  // Countdown timer for seat lock
  useEffect(() => {
    if (!lockExpiresAt) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
        setLockExpiresAt(null);
        setErrorMsg('Your 10-minute reservation lock has expired. Seats have been released.');
        setSelectedSeatNumbers([]);
        fetchSeats();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockExpiresAt, fetchSeats]);

  // Handle seat click
  const handleToggleSeat = async (seat: SeatItem) => {
    if (seat.status === 'booked' || seat.status === 'locked') {
      return; // Not selectable
    }

    const isAlreadySelected = selectedSeatNumbers.includes(seat.seatNumber);
    let nextSelected: string[];

    if (isAlreadySelected) {
      nextSelected = selectedSeatNumbers.filter((s) => s !== seat.seatNumber);
    } else {
      if (selectedSeatNumbers.length >= 8) {
        setErrorMsg('You can select a maximum of 8 seats per booking.');
        return;
      }
      nextSelected = [...selectedSeatNumbers, seat.seatNumber];
    }

    setSelectedSeatNumbers(nextSelected);
    setErrorMsg(null);

    // If seats remain selected, acquire/refresh backend lock
    if (nextSelected.length > 0) {
      setIsLocking(true);
      try {
        const lockRes = await apiRequest<{
          success: boolean;
          expiresAt: string;
          lockDurationSeconds: number;
        }>('/api/bookings/lock-seats', {
          method: 'POST',
          body: JSON.stringify({
            showtimeId,
            seatNumbers: nextSelected,
          }),
        });

        if (lockRes.success) {
          const expiryTime = new Date(lockRes.expiresAt).getTime();
          setLockExpiresAt(expiryTime);
          setSecondsRemaining(lockRes.lockDurationSeconds);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Seat conflict: This seat was just reserved by someone else.');
        // Revert selection and refresh
        fetchSeats();
      } finally {
        setIsLocking(false);
      }
    } else {
      // Release lock
      try {
        await apiRequest('/api/bookings/lock-seats', {
          method: 'DELETE',
          body: JSON.stringify({ showtimeId }),
        });
      } catch (e) {
        // ignore
      }
      setLockExpiresAt(null);
      setSecondsRemaining(0);
    }
  };

  // Calculate pricing breakdown
  const selectedSeatsList = seatData?.seats.filter((s) => selectedSeatNumbers.includes(s.seatNumber)) || [];
  const totalPrice = selectedSeatsList.reduce((sum, s) => sum + s.price, 0);

  // Proceed to checkout
  const handleProceedToCheckout = () => {
    if (selectedSeatNumbers.length === 0 || !seatData) return;

    navigate('/checkout', {
      state: {
        showtimeId: seatData.showtime._id,
        movie: seatData.movie,
        theatre: seatData.theatre,
        screen: seatData.screen,
        showtime: seatData.showtime,
        selectedSeats: selectedSeatsList,
        totalAmount: totalPrice,
        lockExpiresAt,
      },
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm text-slate-400">Loading auditorium seating blueprint...</span>
      </div>
    );
  }

  if (!seatData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Showtime Unavailable</h2>
        <p className="text-xs text-slate-400">{errorMsg || 'Could not load seating data.'}</p>
        <Link to="/movies" className="inline-block px-4 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 rounded-lg">
          Browse Other Showtimes
        </Link>
      </div>
    );
  }

  // Format countdown mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Top Bar with back link and showtime context */}
      <div className="bg-slate-900/80 border-b border-slate-800 sticky top-18 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={`/movies/${seatData.movie._id}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                {seatData.movie.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{seatData.theatre.name}</span>
                <span aria-hidden="true">·</span>
                <span className="text-rose-400 font-medium">{seatData.screen.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{seatData.showtime.date} at {seatData.showtime.startTime}</span>
              </div>
            </div>
          </div>

          {/* Seat Lock Timer Banner */}
          {lockExpiresAt && secondsRemaining > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-lg text-amber-300 text-xs">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Seats Locked for:</span>
              <span className="font-mono font-bold text-sm tabular-nums text-amber-200">
                {formatTimer(secondsRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Seating Canvas */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-rose-200 text-xs underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Curved Cinema Screen with glow */}
        <div className="flex flex-col items-center justify-center pt-2 pb-6">
          <div className="w-full max-w-2xl h-8 border-t-4 border-rose-500 rounded-t-[50%] shadow-[0_-15px_30px_rgba(244,63,94,0.3)] cinema-screen-glow" />
          <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase mt-2">
            CINEMA PROJECTION SCREEN
          </span>
        </div>

        {/* Seating Grid */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-10 overflow-x-auto shadow-2xl">
          <div className="min-w-[620px] flex flex-col items-center space-y-3">
            {seatData.screen.rows.map((rowLetter) => {
              const rowSeats = seatData.seats.filter((s) => s.row === rowLetter);
              const rowTier = rowSeats[0]?.tier || 'Standard';

              return (
                <div key={rowLetter} className="flex items-center gap-3 w-full justify-center">
                  {/* Row Letter Left */}
                  <span className="w-6 text-center text-xs font-mono font-bold text-slate-500">
                    {rowLetter}
                  </span>

                  {/* Seats in this row */}
                  <div className="flex items-center gap-2">
                    {rowSeats.map((seat) => {
                      const isSelected = selectedSeatNumbers.includes(seat.seatNumber);
                      const isBooked = seat.status === 'booked';
                      const isLocked = seat.status === 'locked';

                      let seatStyle = 'bg-slate-800 border-slate-700 text-slate-300 hover:border-rose-500 hover:bg-slate-700';

                      if (isSelected) {
                        seatStyle = 'bg-rose-600 border-rose-500 text-white shadow-md shadow-rose-600/50 scale-105';
                      } else if (isBooked) {
                        seatStyle = 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed opacity-50';
                      } else if (isLocked) {
                        seatStyle = 'bg-amber-950/60 border-amber-800/80 text-amber-500/70 cursor-not-allowed opacity-60';
                      } else if (seat.tier === 'VIP') {
                        seatStyle = 'bg-purple-950/40 border-purple-800/80 text-purple-200 hover:border-purple-500';
                      } else if (seat.tier === 'Premium') {
                        seatStyle = 'bg-blue-950/40 border-blue-800/80 text-blue-200 hover:border-blue-500';
                      }

                      return (
                        <button
                          key={seat.seatNumber}
                          onClick={() => handleToggleSeat(seat)}
                          disabled={isBooked || isLocked}
                          title={`Seat ${seat.seatNumber} (${seat.tier}) - $${seat.price}${isBooked ? ' (Reserved)' : isLocked ? ' (Held by another customer)' : ''}`}
                          className={`w-8 h-8 rounded-md text-xs font-mono font-semibold flex items-center justify-center border transition-all duration-150 ${seatStyle}`}
                        >
                          {seat.number}
                        </button>
                      );
                    })}
                  </div>

                  {/* Row Letter Right */}
                  <span className="w-6 text-center text-xs font-mono font-bold text-slate-500">
                    {rowLetter}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seating Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-4 text-xs text-slate-400 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-800 border border-slate-700" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-rose-600 border border-rose-500" />
            <span>Selected (You)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-950 border border-slate-800 opacity-60" />
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-950/60 border border-amber-800" />
            <span>Held (Other User)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-950/40 border border-purple-800" />
            <span>VIP Recliner Tier</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-950/40 border border-blue-800" />
            <span>Premium Tier</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Tray */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800 backdrop-blur-lg px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Selected seats pills & breakdown */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="text-xs text-slate-400">
              Selected Seats ({selectedSeatNumbers.length}):
            </div>
            {selectedSeatNumbers.length === 0 ? (
              <span className="text-xs text-slate-500 italic">None selected yet</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedSeatsList.map((s) => (
                  <span
                    key={s.seatNumber}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white"
                  >
                    {s.seatNumber} (${s.price})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Pricing & CTA */}
          <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
            <div className="text-right">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Total Amount</span>
              <span className="text-xl font-black text-white font-mono tabular-nums">
                ${totalPrice.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleProceedToCheckout}
              disabled={selectedSeatNumbers.length === 0 || isLocking}
              className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all ${
                selectedSeatNumbers.length > 0 && !isLocking
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Proceed to Checkout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
