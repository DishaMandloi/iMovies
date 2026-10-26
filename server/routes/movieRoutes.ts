import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DB, saveDb } from '../db.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth.js';
import { Movie } from '../types.js';

const router = Router();

// Get all movies with search, filter, and sort
router.get('/', (req: Request, res: Response): void => {
  try {
    const {
      search,
      genre,
      language,
      status,
      sortBy = 'releaseDate',
      order = 'desc',
      limit,
      page = '1',
    } = req.query;

    let movies = [...DB.movies];

    // Filter: search text
    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      movies = movies.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.cast.some((c) => c.toLowerCase().includes(q)) ||
          (m.director && m.director.toLowerCase().includes(q))
      );
    }

    // Filter: genre
    if (genre && typeof genre === 'string' && genre !== 'all') {
      movies = movies.filter((m) =>
        m.genre.some((g) => g.toLowerCase() === genre.toLowerCase())
      );
    }

    // Filter: language
    if (language && typeof language === 'string' && language !== 'all') {
      movies = movies.filter((m) =>
        m.language.some((l) => l.toLowerCase() === language.toLowerCase())
      );
    }

    // Filter: status
    if (status && typeof status === 'string' && status !== 'all') {
      movies = movies.filter((m) => m.status === status);
    }

    // Sort
    movies.sort((a, b) => {
      let valA: string | number = a.releaseDate;
      let valB: string | number = b.releaseDate;

      if (sortBy === 'rating') {
        valA = a.rating;
        valB = b.rating;
      } else if (sortBy === 'title') {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      } else if (sortBy === 'duration') {
        valA = a.duration;
        valB = b.duration;
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    const total = movies.length;

    // Pagination
    if (limit) {
      const numLimit = parseInt(limit as string, 10) || 12;
      const numPage = parseInt(page as string, 10) || 1;
      const offset = (numPage - 1) * numLimit;
      movies = movies.slice(offset, offset + numLimit);
    }

    res.json({
      success: true,
      total,
      movies,
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve movies.' });
  }
});

// Get single movie with associated showtimes and theatres
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const movie = DB.movies.find((m) => m._id === req.params.id);
    if (!movie) {
      res.status(404).json({ success: false, message: 'Movie not found.' });
      return;
    }

    // Find showtimes for this movie
    const today = new Date().toISOString().split('T')[0];
    const movieShowtimes = DB.showtimes.filter(
      (s) => s.movieId === movie._id && s.date >= today && s.status === 'active'
    );

    // Collect theatre details
    const theatreMap = new Map();
    for (const st of movieShowtimes) {
      if (!theatreMap.has(st.theatreId)) {
        const theatre = DB.theatres.find((t) => t._id === st.theatreId);
        if (theatre) {
          theatreMap.set(st.theatreId, {
            ...theatre,
            screens: DB.screens.filter((sc) => sc.theatreId === theatre._id),
          });
        }
      }
    }

    res.json({
      success: true,
      movie,
      showtimes: movieShowtimes,
      theatres: Array.from(theatreMap.values()),
    });
  } catch (error) {
    console.error('Error fetching movie details:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve movie details.' });
  }
});

// Admin: Create Movie
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const {
        title,
        description,
        posterUrl,
        backdropUrl,
        genre,
        language,
        duration,
        rating,
        releaseDate,
        cast,
        director,
        status,
      } = req.body;

      if (!title || !description) {
        res.status(400).json({ success: false, message: 'Title and description are required.' });
        return;
      }

      const now = new Date().toISOString();
      const newMovie: Movie = {
        _id: `mov-${crypto.randomUUID()}`,
        title: title.trim(),
        description: description.trim(),
        posterUrl: posterUrl || '/src/assets/images/poster_neon_detective_1792995198830.jpg',
        backdropUrl: backdropUrl || '/src/assets/images/hero_cinema_hall_1792995217612.jpg',
        genre: Array.isArray(genre) ? genre : (genre || 'Action').split(',').map((g: string) => g.trim()),
        language: Array.isArray(language) ? language : (language || 'English').split(',').map((l: string) => l.trim()),
        duration: Number(duration) || 120,
        rating: Number(rating) || 8.0,
        releaseDate: releaseDate || now.split('T')[0],
        cast: Array.isArray(cast) ? cast : (cast || '').split(',').map((c: string) => c.trim()).filter(Boolean),
        director: director || 'Director',
        status: status === 'upcoming' ? 'upcoming' : 'currently showing',
        createdAt: now,
        updatedAt: now,
      };

      DB.movies.unshift(newMovie);
      saveDb();

      res.status(201).json({ success: true, message: 'Movie created successfully.', movie: newMovie });
    } catch (error) {
      console.error('Error creating movie:', error);
      res.status(500).json({ success: false, message: 'Failed to create movie.' });
    }
  }
);

// Admin: Update Movie
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const index = DB.movies.findIndex((m) => m._id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: 'Movie not found.' });
        return;
      }

      const existing = DB.movies[index];
      const {
        title,
        description,
        posterUrl,
        backdropUrl,
        genre,
        language,
        duration,
        rating,
        releaseDate,
        cast,
        director,
        status,
      } = req.body;

      DB.movies[index] = {
        ...existing,
        title: title !== undefined ? title.trim() : existing.title,
        description: description !== undefined ? description.trim() : existing.description,
        posterUrl: posterUrl !== undefined ? posterUrl : existing.posterUrl,
        backdropUrl: backdropUrl !== undefined ? backdropUrl : existing.backdropUrl,
        genre: genre !== undefined ? (Array.isArray(genre) ? genre : genre.split(',').map((g: string) => g.trim())) : existing.genre,
        language: language !== undefined ? (Array.isArray(language) ? language : language.split(',').map((l: string) => l.trim())) : existing.language,
        duration: duration !== undefined ? Number(duration) : existing.duration,
        rating: rating !== undefined ? Number(rating) : existing.rating,
        releaseDate: releaseDate !== undefined ? releaseDate : existing.releaseDate,
        cast: cast !== undefined ? (Array.isArray(cast) ? cast : cast.split(',').map((c: string) => c.trim())) : existing.cast,
        director: director !== undefined ? director : existing.director,
        status: status !== undefined ? status : existing.status,
        updatedAt: new Date().toISOString(),
      };

      saveDb();
      res.json({ success: true, message: 'Movie updated successfully.', movie: DB.movies[index] });
    } catch (error) {
      console.error('Error updating movie:', error);
      res.status(500).json({ success: false, message: 'Failed to update movie.' });
    }
  }
);

// Admin: Delete Movie
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const index = DB.movies.findIndex((m) => m._id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: 'Movie not found.' });
        return;
      }

      // Check if movie has active bookings
      const hasActiveBookings = DB.bookings.some(
        (b) => b.movieId === req.params.id && b.bookingStatus === 'confirmed'
      );
      if (hasActiveBookings) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete movie with active bookings. Cancel the bookings or mark movie as upcoming instead.',
        });
        return;
      }

      const deleted = DB.movies.splice(index, 1)[0];
      // Also remove associated showtimes
      const initialShowtimesCount = DB.showtimes.length;
      for (let i = DB.showtimes.length - 1; i >= 0; i--) {
        if (DB.showtimes[i].movieId === req.params.id) {
          DB.showtimes.splice(i, 1);
        }
      }

      saveDb();
      res.json({
        success: true,
        message: `Movie "${deleted.title}" deleted successfully.`,
        deletedMovie: deleted,
      });
    } catch (error) {
      console.error('Error deleting movie:', error);
      res.status(500).json({ success: false, message: 'Failed to delete movie.' });
    }
  }
);

export default router;
