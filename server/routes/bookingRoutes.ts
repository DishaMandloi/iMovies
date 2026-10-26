import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DB, saveDb, cleanupExpiredLocks } from '../db.js';
import { authenticateToken, optionalAuth, requireAdmin, AuthenticatedRequest } from '../auth.js';
import { Booking, BookingSeat, SeatLock } from '../types.js';

const router = Router();

// Helper: Generate unique reference like IMOV-738291
function generateBookingReference(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `IMOV-${randomDigits}`;
}


// POST /api/bookings/lock-seats - Lock seats temporarily during checkout (10 mins)
router.post('/lock-seats', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const unlock = await DB.acquireSeatLock();
  try {
    cleanupExpiredLocks();
    const { showtimeId, seatNumbers } = req.body;

    if (!showtimeId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      res.status(400).json({ success: false, message: 'showtimeId and seatNumbers are required.' });
      return;
    }

    const currentUserId = req.user?.userId || (req.headers['x-client-id'] as string) || req.body.clientId;
    if (!currentUserId) {
      res.status(400).json({ success: false, message: 'User or client identifier required to lock seats.' });
      return;
    }

    const showtime = DB.showtimes.find((s) => s._id === showtimeId && s.status === 'active');
    if (!showtime) {
      res.status(404).json({ success: false, message: 'Showtime not found or inactive.' });
      return;
    }

    // 1. Check if any seat is already booked
    const confirmedBookings = DB.bookings.filter(
      (b) => b.showtimeId === showtimeId && b.bookingStatus === 'confirmed'
    );
    const bookedSeats = new Set<string>();
    confirmedBookings.forEach((b) => b.seats.forEach((s) => bookedSeats.add(s.seatNumber)));

    for (const sn of seatNumbers) {
      if (bookedSeats.has(sn)) {
        res.status(409).json({
          success: false,
          message: `Seat ${sn} has already been reserved by another customer. Please select different seats.`,
        });
        return;
      }
    }

    // 2. Check if any seat is locked by someone else
    const activeLocks = DB.seatLocks.filter((l) => l.showtimeId === showtimeId);
    for (const lock of activeLocks) {
      if (lock.userId !== currentUserId) {
        for (const sn of seatNumbers) {
          if (lock.seatNumbers.includes(sn)) {
            res.status(409).json({
              success: false,
              message: `Seat ${sn} is temporarily on hold by another customer. Please choose other seats or retry shortly.`,
            });
            return;
          }
        }
      }
    }

    // 3. Remove existing lock for this user on this showtime
    const existingLockIndex = DB.seatLocks.findIndex(
      (l) => l.showtimeId === showtimeId && l.userId === currentUserId
    );
    if (existingLockIndex !== -1) {
      DB.seatLocks.splice(existingLockIndex, 1);
    }

    // 4. Create new lock for 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const newLock: SeatLock = {
      _id: `lock-${crypto.randomUUID()}`,
      showtimeId,
      seatNumbers,
      userId: currentUserId,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    DB.seatLocks.push(newLock);
    saveDb();

    res.json({
      success: true,
      message: 'Seats locked for 10 minutes.',
      lockedSeats: seatNumbers,
      expiresAt,
      lockDurationSeconds: 600,
    });
  } catch (error) {
    console.error('Error locking seats:', error);
    res.status(500).json({ success: false, message: 'Failed to lock seats.' });
  } finally {
    unlock();
  }
});

// DELETE /api/bookings/lock-seats - Release seat lock
router.delete('/lock-seats', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const unlock = await DB.acquireSeatLock();
  try {
    const { showtimeId } = req.body;
    const currentUserId = req.user?.userId || (req.headers['x-client-id'] as string) || req.body.clientId;

    if (showtimeId && currentUserId) {
      const lockIdx = DB.seatLocks.findIndex(
        (l) => l.showtimeId === showtimeId && l.userId === currentUserId
      );
      if (lockIdx !== -1) {
        DB.seatLocks.splice(lockIdx, 1);
        saveDb();
      }
    }

    res.json({ success: true, message: 'Seat lock released.' });
  } catch (error) {
    console.error('Error releasing seat lock:', error);
    res.status(500).json({ success: false, message: 'Failed to release lock.' });
  } finally {
    unlock();
  }
});

// POST /api/bookings - Confirm booking
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const unlock = await DB.acquireSeatLock();
  try {
    cleanupExpiredLocks();
    const { showtimeId, seats, customerName, customerEmail } = req.body;

    if (!showtimeId || !Array.isArray(seats) || seats.length === 0) {
      res.status(400).json({ success: false, message: 'Showtime and selected seats are required.' });
      return;
    }

    const showtime = DB.showtimes.find((s) => s._id === showtimeId && s.status === 'active');
    if (!showtime) {
      res.status(404).json({ success: false, message: 'Showtime is invalid or no longer active.' });
      return;
    }

    const screen = DB.screens.find((sc) => sc._id === showtime.screenId);
    const theatre = DB.theatres.find((t) => t._id === showtime.theatreId);
    const movie = DB.movies.find((m) => m._id === showtime.movieId);

    if (!screen || !theatre || !movie) {
      res.status(400).json({ success: false, message: 'Incomplete showtime configuration.' });
      return;
    }

    const currentUserId = req.user!.userId;
    const requestedSeatNumbers = seats.map((s: { seatNumber: string }) => s.seatNumber);

    // 1. Re-validate: Ensure NO requested seat is booked
    const existingBookings = DB.bookings.filter(
      (b) => b.showtimeId === showtimeId && b.bookingStatus === 'confirmed'
    );
    const alreadyBooked = new Set<string>();
    existingBookings.forEach((b) => b.seats.forEach((s) => alreadyBooked.add(s.seatNumber)));

    for (const sn of requestedSeatNumbers) {
      if (alreadyBooked.has(sn)) {
        res.status(409).json({
          success: false,
          message: `Seat ${sn} has already been booked by another customer. Reservation aborted.`,
        });
        return;
      }
    }

    // 2. Re-validate seat locks (ensure not locked by someone else)
    const activeLocks = DB.seatLocks.filter((l) => l.showtimeId === showtimeId);
    for (const lock of activeLocks) {
      if (lock.userId !== currentUserId) {
        for (const sn of requestedSeatNumbers) {
          if (lock.seatNumbers.includes(sn)) {
            res.status(409).json({
              success: false,
              message: `Seat ${sn} is currently held by another user. Please choose another seat.`,
            });
            return;
          }
        }
      }
    }

    // 3. Compute accurate total amount based on screen layout pricing
    let totalAmount = 0;
    const verifiedSeats: BookingSeat[] = [];

    for (const s of seats) {
      const layoutSeat = screen.seatLayout.seats.find((ls) => ls.seatNumber === s.seatNumber);
      const tier = layoutSeat?.tier || 'Standard';
      const multiplier = layoutSeat?.priceMultiplier || 1.0;
      const seatPrice = Math.round(showtime.ticketPrice * multiplier);

      verifiedSeats.push({
        seatNumber: s.seatNumber,
        tier,
        price: seatPrice,
      });
      totalAmount += seatPrice;
    }

    // 4. Create confirmed booking
    const bookingReference = generateBookingReference();
    const now = new Date().toISOString();

    const newBooking: Booking = {
      _id: `bkg-${crypto.randomUUID()}`,
      bookingReference,
      userId: currentUserId,
      movieId: movie._id,
      theatreId: theatre._id,
      screenId: screen._id,
      showtimeId: showtime._id,
      seats: verifiedSeats,
      totalAmount,
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      customerName: customerName || req.user!.name,
      customerEmail: customerEmail || req.user!.email,
      createdAt: now,
      updatedAt: now,
    };

    DB.bookings.unshift(newBooking);

    // 5. Release any seat locks held by this user for this showtime
    const lockIdx = DB.seatLocks.findIndex(
      (l) => l.showtimeId === showtimeId && l.userId === currentUserId
    );
    if (lockIdx !== -1) {
      DB.seatLocks.splice(lockIdx, 1);
    }

    saveDb();

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: {
        ...newBooking,
        movieTitle: movie.title,
        moviePoster: movie.posterUrl,
        theatreName: theatre.name,
        theatreAddress: theatre.address,
        screenName: screen.name,
        showDate: showtime.date,
        showStartTime: showtime.startTime,
        showEndTime: showtime.endTime,
      },
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: 'Failed to complete booking reservation.' });
  } finally {
    unlock();
  }
});

// GET /api/bookings/my - Get user's bookings
router.get('/my', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userBookings = DB.bookings.filter((b) => b.userId === req.user!.userId);

    const enriched = userBookings.map((b) => {
      const movie = DB.movies.find((m) => m._id === b.movieId);
      const theatre = DB.theatres.find((t) => t._id === b.theatreId);
      const screen = DB.screens.find((s) => s._id === b.screenId);
      const showtime = DB.showtimes.find((st) => st._id === b.showtimeId);

      return {
        ...b,
        movieTitle: movie?.title || 'Movie',
        moviePoster: movie?.posterUrl || '',
        movieDuration: movie?.duration || 120,
        theatreName: theatre?.name || 'Theatre',
        theatreAddress: theatre?.address || '',
        screenName: screen?.name || 'Screen',
        showDate: showtime?.date || '',
        showStartTime: showtime?.startTime || '',
        showEndTime: showtime?.endTime || '',
      };
    });

    res.json({ success: true, count: enriched.length, bookings: enriched });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve booking history.' });
  }
});

// GET /api/bookings/:id - Get single booking details
router.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const booking = DB.bookings.find(
      (b) => b._id === req.params.id || b.bookingReference === req.params.id
    );

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found.' });
      return;
    }

    // Security check: User must own the booking or be admin
    if (booking.userId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized to view this booking.' });
      return;
    }

    const movie = DB.movies.find((m) => m._id === booking.movieId);
    const theatre = DB.theatres.find((t) => t._id === booking.theatreId);
    const screen = DB.screens.find((s) => s._id === booking.screenId);
    const showtime = DB.showtimes.find((st) => st._id === booking.showtimeId);

    res.json({
      success: true,
      booking: {
        ...booking,
        movieTitle: movie?.title,
        moviePoster: movie?.posterUrl,
        movieDuration: movie?.duration,
        movieGenre: movie?.genre,
        movieLanguage: movie?.language,
        theatreName: theatre?.name,
        theatreAddress: theatre?.address,
        screenName: screen?.name,
        screenType: screen?.screenType,
        showDate: showtime?.date,
        showStartTime: showtime?.startTime,
        showEndTime: showtime?.endTime,
      },
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve booking details.' });
  }
});

// PATCH /api/bookings/:id/cancel - Cancel booking
router.patch('/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const booking = DB.bookings.find(
      (b) => b._id === req.params.id || b.bookingReference === req.params.id
    );

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found.' });
      return;
    }

    // Security check
    if (booking.userId !== req.user!.userId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized to cancel this booking.' });
      return;
    }

    if (booking.bookingStatus === 'cancelled') {
      res.status(400).json({ success: false, message: 'This booking is already cancelled.' });
      return;
    }

    const showtime = DB.showtimes.find((s) => s._id === booking.showtimeId);
    if (showtime) {
      // Check if showtime date has already passed
      const showDateTime = new Date(`${showtime.date}T${showtime.startTime}:00`);
      if (showDateTime.getTime() < Date.now()) {
        res.status(400).json({
          success: false,
          message: 'Cannot cancel a booking for a showtime that has already started or concluded.',
        });
        return;
      }
    }

    booking.bookingStatus = 'cancelled';
    booking.paymentStatus = 'refunded';
    booking.updatedAt = new Date().toISOString();

    saveDb();

    res.json({
      success: true,
      message: 'Booking cancelled successfully. A full refund has been initiated.',
      booking,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  }
});

// GET /api/admin/bookings - List all bookings for admin
router.get('/', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { search, status, page = '1', limit = '20' } = req.query;

    let list = [...DB.bookings];

    if (status && typeof status === 'string' && status !== 'all') {
      list = list.filter((b) => b.bookingStatus === status);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.bookingReference.toLowerCase().includes(q) ||
          b.customerName.toLowerCase().includes(q) ||
          b.customerEmail.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = list.length;
    const numLimit = parseInt(limit as string, 10);
    const numPage = parseInt(page as string, 10);
    const paginated = list.slice((numPage - 1) * numLimit, numPage * numLimit);

    const enriched = paginated.map((b) => {
      const movie = DB.movies.find((m) => m._id === b.movieId);
      const theatre = DB.theatres.find((t) => t._id === b.theatreId);
      const screen = DB.screens.find((s) => s._id === b.screenId);
      const showtime = DB.showtimes.find((s) => s._id === b.showtimeId);
      return {
        ...b,
        movieTitle: movie?.title || 'Unknown Movie',
        theatreName: theatre?.name || 'Unknown Theatre',
        screenName: screen?.name || 'Unknown Screen',
        showDate: showtime?.date || '',
        showStartTime: showtime?.startTime || '',
      };
    });

    res.json({ success: true, total, bookings: enriched });
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve bookings.' });
  }
});

export default router;
