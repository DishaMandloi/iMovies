import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DB, saveDb, cleanupExpiredLocks } from '../db.js';
import { authenticateToken, optionalAuth, requireAdmin, AuthenticatedRequest } from '../auth.js';
import { Showtime } from '../types.js';

const router = Router();

// Helper: convert HH:MM to total minutes
function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Check schedule overlap
function isOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  return Math.max(s1, s2) < Math.min(e1, e2);
}

// GET /api/showtimes
router.get('/', (req: Request, res: Response): void => {
  try {
    const { movieId, theatreId, screenId, date, status } = req.query;

    let showtimes = [...DB.showtimes];

    if (movieId && typeof movieId === 'string') {
      showtimes = showtimes.filter((s) => s.movieId === movieId);
    }

    if (theatreId && typeof theatreId === 'string') {
      showtimes = showtimes.filter((s) => s.theatreId === theatreId);
    }

    if (screenId && typeof screenId === 'string') {
      showtimes = showtimes.filter((s) => s.screenId === screenId);
    }

    if (date && typeof date === 'string') {
      showtimes = showtimes.filter((s) => s.date === date);
    }

    if (status && typeof status === 'string') {
      showtimes = showtimes.filter((s) => s.status === status);
    }

    // Sort by date then startTime
    showtimes.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

    // Enrich with movie, theatre, and screen titles
    const enriched = showtimes.map((st) => {
      const movie = DB.movies.find((m) => m._id === st.movieId);
      const theatre = DB.theatres.find((t) => t._id === st.theatreId);
      const screen = DB.screens.find((sc) => sc._id === st.screenId);
      return {
        ...st,
        movieTitle: movie?.title || 'Unknown Movie',
        moviePoster: movie?.posterUrl || '',
        movieDuration: movie?.duration || 120,
        theatreName: theatre?.name || 'Unknown Theatre',
        screenName: screen?.name || 'Unknown Screen',
        screenType: screen?.screenType || 'Standard',
        totalSeats: screen?.totalSeats || 0,
      };
    });

    res.json({ success: true, count: enriched.length, showtimes: enriched });
  } catch (error) {
    console.error('Error fetching showtimes:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve showtimes.' });
  }
});

// GET /api/showtimes/:id
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const showtime = DB.showtimes.find((s) => s._id === req.params.id);
    if (!showtime) {
      res.status(404).json({ success: false, message: 'Showtime not found.' });
      return;
    }

    const movie = DB.movies.find((m) => m._id === showtime.movieId);
    const theatre = DB.theatres.find((t) => t._id === showtime.theatreId);
    const screen = DB.screens.find((sc) => sc._id === showtime.screenId);

    res.json({
      success: true,
      showtime: {
        ...showtime,
        movie,
        theatre,
        screen,
      },
    });
  } catch (error) {
    console.error('Error fetching showtime:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve showtime.' });
  }
});

// GET /api/showtimes/:id/seats - Get real-time seat availability
router.get('/:id/seats', optionalAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    cleanupExpiredLocks();
    const showtime = DB.showtimes.find((s) => s._id === req.params.id);
    if (!showtime) {
      res.status(404).json({ success: false, message: 'Showtime not found.' });
      return;
    }

    const screen = DB.screens.find((s) => s._id === showtime.screenId);
    if (!screen) {
      res.status(404).json({ success: false, message: 'Screen configuration not found.' });
      return;
    }

    const movie = DB.movies.find((m) => m._id === showtime.movieId);
    const theatre = DB.theatres.find((t) => t._id === showtime.theatreId);

    // Current user identifier
    const currentUserId = req.user?.userId || (req.headers['x-client-id'] as string) || '';

    // Find all confirmed bookings for this showtime
    const confirmedBookings = DB.bookings.filter(
      (b) => b.showtimeId === showtime._id && b.bookingStatus === 'confirmed'
    );
    const bookedSeatNumbers = new Set<string>();
    confirmedBookings.forEach((b) => {
      b.seats.forEach((seat) => bookedSeatNumbers.add(seat.seatNumber));
    });

    // Find active seat locks for this showtime
    const activeLocks = DB.seatLocks.filter((l) => l.showtimeId === showtime._id);
    const lockedByOthers = new Set<string>();
    const lockedByMe = new Set<string>();

    activeLocks.forEach((lock) => {
      lock.seatNumbers.forEach((sn) => {
        if (currentUserId && lock.userId === currentUserId) {
          lockedByMe.add(sn);
        } else {
          lockedByOthers.add(sn);
        }
      });
    });

    // Compute status and dynamic price for each seat
    const seatsWithStatus = screen.seatLayout.seats.map((seat) => {
      const seatPrice = Math.round(showtime.ticketPrice * seat.priceMultiplier);
      let status: 'available' | 'booked' | 'locked' | 'selected' = 'available';

      if (bookedSeatNumbers.has(seat.seatNumber)) {
        status = 'booked';
      } else if (lockedByMe.has(seat.seatNumber)) {
        status = 'selected';
      } else if (lockedByOthers.has(seat.seatNumber)) {
        status = 'locked';
      }

      return {
        ...seat,
        price: seatPrice,
        status,
      };
    });

    const totalAvailable = seatsWithStatus.filter((s) => s.status === 'available').length;

    res.json({
      success: true,
      showtime: {
        _id: showtime._id,
        date: showtime.date,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        basePrice: showtime.ticketPrice,
      },
      movie: {
        _id: movie?._id,
        title: movie?.title,
        posterUrl: movie?.posterUrl,
        duration: movie?.duration,
      },
      theatre: {
        _id: theatre?._id,
        name: theatre?.name,
        address: theatre?.address,
      },
      screen: {
        _id: screen._id,
        name: screen.name,
        screenType: screen.screenType,
        rows: screen.seatLayout.rows,
        seatsPerRow: screen.seatLayout.seatsPerRow,
      },
      totalSeats: screen.totalSeats,
      totalAvailable,
      totalBooked: bookedSeatNumbers.size,
      seats: seatsWithStatus,
    });
  } catch (error) {
    console.error('Error fetching seat layout:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve seats.' });
  }
});

// POST /api/showtimes (Admin)
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { movieId, theatreId, screenId, date, startTime, endTime, ticketPrice } = req.body;

      if (!movieId || !theatreId || !screenId || !date || !startTime || !endTime) {
        res.status(400).json({ success: false, message: 'All showtime fields are required.' });
        return;
      }

      // Check if screen exists
      const screen = DB.screens.find((s) => s._id === screenId);
      if (!screen) {
        res.status(404).json({ success: false, message: 'Specified screen does not exist.' });
        return;
      }

      // Check for overlapping showtimes on the same screen and date!
      const conflictingShowtime = DB.showtimes.find(
        (st) =>
          st.screenId === screenId &&
          st.date === date &&
          st.status === 'active' &&
          isOverlapping(startTime, endTime, st.startTime, st.endTime)
      );

      if (conflictingShowtime) {
        const movie = DB.movies.find((m) => m._id === conflictingShowtime.movieId);
        res.status(409).json({
          success: false,
          message: `Schedule conflict: Screen "${screen.name}" is already reserved for "${movie?.title || 'Another Movie'}" between ${conflictingShowtime.startTime} and ${conflictingShowtime.endTime}.`,
        });
        return;
      }

      const now = new Date().toISOString();
      const newShowtime: Showtime = {
        _id: `st-${crypto.randomUUID()}`,
        movieId,
        theatreId,
        screenId,
        date,
        startTime,
        endTime,
        ticketPrice: Number(ticketPrice) || 15,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      DB.showtimes.push(newShowtime);
      saveDb();

      res.status(201).json({ success: true, message: 'Showtime scheduled successfully.', showtime: newShowtime });
    } catch (error) {
      console.error('Error creating showtime:', error);
      res.status(500).json({ success: false, message: 'Failed to create showtime.' });
    }
  }
);

// PUT /api/showtimes/:id (Admin)
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const index = DB.showtimes.findIndex((s) => s._id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: 'Showtime not found.' });
        return;
      }

      const existing = DB.showtimes[index];
      const { startTime, endTime, ticketPrice, status, date } = req.body;

      const newDate = date || existing.date;
      const newStart = startTime || existing.startTime;
      const newEnd = endTime || existing.endTime;

      // Check conflicts with other showtimes
      const conflict = DB.showtimes.find(
        (st) =>
          st._id !== existing._id &&
          st.screenId === existing.screenId &&
          st.date === newDate &&
          st.status === 'active' &&
          isOverlapping(newStart, newEnd, st.startTime, st.endTime)
      );

      if (conflict) {
        res.status(409).json({
          success: false,
          message: `Schedule conflict: Overlaps with an existing showtime (${conflict.startTime} - ${conflict.endTime}).`,
        });
        return;
      }

      DB.showtimes[index] = {
        ...existing,
        date: newDate,
        startTime: newStart,
        endTime: newEnd,
        ticketPrice: ticketPrice !== undefined ? Number(ticketPrice) : existing.ticketPrice,
        status: status !== undefined ? status : existing.status,
        updatedAt: new Date().toISOString(),
      };

      saveDb();
      res.json({ success: true, message: 'Showtime updated.', showtime: DB.showtimes[index] });
    } catch (error) {
      console.error('Error updating showtime:', error);
      res.status(500).json({ success: false, message: 'Failed to update showtime.' });
    }
  }
);

// DELETE /api/showtimes/:id (Admin)
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const index = DB.showtimes.findIndex((s) => s._id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: 'Showtime not found.' });
        return;
      }

      const hasConfirmedBookings = DB.bookings.some(
        (b) => b.showtimeId === req.params.id && b.bookingStatus === 'confirmed'
      );

      if (hasConfirmedBookings) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete showtime that has confirmed customer bookings.',
        });
        return;
      }

      const deleted = DB.showtimes.splice(index, 1)[0];
      saveDb();
      res.json({ success: true, message: 'Showtime deleted.', showtime: deleted });
    } catch (error) {
      console.error('Error deleting showtime:', error);
      res.status(500).json({ success: false, message: 'Failed to delete showtime.' });
    }
  }
);

export default router;
