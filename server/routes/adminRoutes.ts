import { Router, Response } from 'express';
import { DB, seedDatabase } from '../db.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest, sanitizeUser } from '../auth.js';

const router = Router();

// GET /api/admin/stats
router.get('/stats', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const totalMovies = DB.movies.length;
    const currentlyShowingMovies = DB.movies.filter((m) => m.status === 'currently showing').length;
    const upcomingMovies = DB.movies.filter((m) => m.status === 'upcoming').length;

    const totalTheatres = DB.theatres.length;
    const totalScreens = DB.screens.length;
    const totalShowtimes = DB.showtimes.length;

    const confirmedBookings = DB.bookings.filter((b) => b.bookingStatus === 'confirmed');
    const cancelledBookings = DB.bookings.filter((b) => b.bookingStatus === 'cancelled');

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalTicketsSold = confirmedBookings.reduce((sum, b) => sum + (b.seats?.length || 0), 0);

    const totalUsers = DB.users.length;
    const activeLocks = DB.seatLocks.length;

    res.json({
      success: true,
      stats: {
        totalMovies,
        currentlyShowingMovies,
        upcomingMovies,
        totalTheatres,
        totalScreens,
        totalShowtimes,
        totalBookings: DB.bookings.length,
        confirmedBookingsCount: confirmedBookings.length,
        cancelledBookingsCount: cancelledBookings.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTicketsSold,
        totalUsers,
        activeLocks,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
});

// GET /api/admin/users
router.get('/users', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    const usersWithStats = DB.users.map((u) => {
      const sanitized = sanitizeUser(u);
      const userBookings = DB.bookings.filter((b) => b.userId === u._id);
      return {
        ...sanitized,
        bookingsCount: userBookings.length,
        totalSpent: userBookings
          .filter((b) => b.bookingStatus === 'confirmed')
          .reduce((sum, b) => sum + b.totalAmount, 0),
      };
    });

    res.json({ success: true, users: usersWithStats });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve user list.' });
  }
});

// GET /api/admin/bookings
router.get('/bookings', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response): void => {
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

// POST /api/admin/reset-seed
router.post('/reset-seed', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  try {
    seedDatabase(true);
    res.json({ success: true, message: 'Database successfully reset to pristine seed data.' });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ success: false, message: 'Failed to reset database.' });
  }
});

export default router;
