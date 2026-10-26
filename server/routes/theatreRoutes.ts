import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DB, saveDb, generateScreenSeats } from '../db.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../auth.js';
import { Theatre, Screen } from '../types.js';

const router = Router();

// Get all theatres
router.get('/', (_req: Request, res: Response): void => {
  try {
    const theatresWithScreens = DB.theatres.map((t) => {
      const screens = DB.screens.filter((s) => s.theatreId === t._id);
      return {
        ...t,
        screens,
        totalScreens: screens.length,
      };
    });
    res.json({ success: true, theatres: theatresWithScreens });
  } catch (error) {
    console.error('Error fetching theatres:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve theatres.' });
  }
});

// Get theatre by ID
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const theatre = DB.theatres.find((t) => t._id === req.params.id);
    if (!theatre) {
      res.status(404).json({ success: false, message: 'Theatre not found.' });
      return;
    }
    const screens = DB.screens.filter((s) => s.theatreId === theatre._id);
    res.json({ success: true, theatre: { ...theatre, screens } });
  } catch (error) {
    console.error('Error fetching theatre:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve theatre.' });
  }
});

// Admin: Create Theatre
router.post(
  '/',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { name, address, city, amenities, phone } = req.body;
      if (!name || !address) {
        res.status(400).json({ success: false, message: 'Theatre name and address are required.' });
        return;
      }

      const now = new Date().toISOString();
      const newTheatre: Theatre = {
        _id: `th-${crypto.randomUUID()}`,
        name: name.trim(),
        address: address.trim(),
        city: city ? city.trim() : 'Metropolis',
        screens: [],
        amenities: Array.isArray(amenities) ? amenities : (amenities || '').split(',').map((a: string) => a.trim()).filter(Boolean),
        phone: phone || '+1 (555) 000-0000',
        createdAt: now,
        updatedAt: now,
      };

      DB.theatres.push(newTheatre);
      saveDb();

      res.status(201).json({ success: true, message: 'Theatre created successfully.', theatre: newTheatre });
    } catch (error) {
      console.error('Error creating theatre:', error);
      res.status(500).json({ success: false, message: 'Failed to create theatre.' });
    }
  }
);

// Admin: Update Theatre
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const index = DB.theatres.findIndex((t) => t._id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: 'Theatre not found.' });
        return;
      }

      const existing = DB.theatres[index];
      const { name, address, city, amenities, phone } = req.body;

      DB.theatres[index] = {
        ...existing,
        name: name !== undefined ? name.trim() : existing.name,
        address: address !== undefined ? address.trim() : existing.address,
        city: city !== undefined ? city.trim() : existing.city,
        amenities: amenities !== undefined ? (Array.isArray(amenities) ? amenities : amenities.split(',').map((a: string) => a.trim())) : existing.amenities,
        phone: phone !== undefined ? phone.trim() : existing.phone,
        updatedAt: new Date().toISOString(),
      };

      saveDb();
      res.json({ success: true, message: 'Theatre updated successfully.', theatre: DB.theatres[index] });
    } catch (error) {
      console.error('Error updating theatre:', error);
      res.status(500).json({ success: false, message: 'Failed to update theatre.' });
    }
  }
);

// Admin: Delete Theatre
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const index = DB.theatres.findIndex((t) => t._id === req.params.id);
      if (index === -1) {
        res.status(404).json({ success: false, message: 'Theatre not found.' });
        return;
      }

      // Check if any active bookings in this theatre
      const hasBookings = DB.bookings.some(
        (b) => b.theatreId === req.params.id && b.bookingStatus === 'confirmed'
      );
      if (hasBookings) {
        res.status(400).json({ success: false, message: 'Cannot delete theatre with active bookings.' });
        return;
      }

      const deleted = DB.theatres.splice(index, 1)[0];

      // Remove associated screens and showtimes
      for (let i = DB.screens.length - 1; i >= 0; i--) {
        if (DB.screens[i].theatreId === req.params.id) {
          DB.screens.splice(i, 1);
        }
      }
      for (let i = DB.showtimes.length - 1; i >= 0; i--) {
        if (DB.showtimes[i].theatreId === req.params.id) {
          DB.showtimes.splice(i, 1);
        }
      }

      saveDb();
      res.json({ success: true, message: `Theatre "${deleted.name}" deleted.`, theatre: deleted });
    } catch (error) {
      console.error('Error deleting theatre:', error);
      res.status(500).json({ success: false, message: 'Failed to delete theatre.' });
    }
  }
);

// Screen APIs:
// POST /api/screens (Create Screen)
router.post(
  '/screens',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { theatreId, name, screenType = 'Standard 4K', rowCount = 5, seatsPerRow = 12 } = req.body;
      if (!theatreId || !name) {
        res.status(400).json({ success: false, message: 'Theatre ID and screen name are required.' });
        return;
      }

      const theatre = DB.theatres.find((t) => t._id === theatreId);
      if (!theatre) {
        res.status(404).json({ success: false, message: 'Theatre not found.' });
        return;
      }

      const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, Number(rowCount));
      const vipRow = [rowLetters[rowLetters.length - 1]];
      const premiumRows = rowLetters.slice(Math.floor(rowLetters.length / 2), rowLetters.length - 1);

      const seatLayout = generateScreenSeats(rowLetters, Number(seatsPerRow), vipRow, premiumRows);
      const now = new Date().toISOString();
      const newScreen: Screen = {
        _id: `scr-${crypto.randomUUID()}`,
        theatreId,
        name: name.trim(),
        screenType,
        totalSeats: seatLayout.seats.length,
        seatLayout,
        createdAt: now,
        updatedAt: now,
      };

      DB.screens.push(newScreen);
      if (!theatre.screens.includes(newScreen._id)) {
        theatre.screens.push(newScreen._id);
      }
      saveDb();

      res.status(201).json({ success: true, message: 'Screen created successfully.', screen: newScreen });
    } catch (error) {
      console.error('Error creating screen:', error);
      res.status(500).json({ success: false, message: 'Failed to create screen.' });
    }
  }
);

// PUT /api/screens/:id
router.put(
  '/screens/:id',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const screenIndex = DB.screens.findIndex((s) => s._id === req.params.id);
      if (screenIndex === -1) {
        res.status(404).json({ success: false, message: 'Screen not found.' });
        return;
      }

      const existing = DB.screens[screenIndex];
      const { name, screenType } = req.body;

      DB.screens[screenIndex] = {
        ...existing,
        name: name !== undefined ? name.trim() : existing.name,
        screenType: screenType !== undefined ? screenType : existing.screenType,
        updatedAt: new Date().toISOString(),
      };

      saveDb();
      res.json({ success: true, message: 'Screen updated.', screen: DB.screens[screenIndex] });
    } catch (error) {
      console.error('Error updating screen:', error);
      res.status(500).json({ success: false, message: 'Failed to update screen.' });
    }
  }
);

// DELETE /api/screens/:id
router.delete(
  '/screens/:id',
  authenticateToken,
  requireAdmin,
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const screenIndex = DB.screens.findIndex((s) => s._id === req.params.id);
      if (screenIndex === -1) {
        res.status(404).json({ success: false, message: 'Screen not found.' });
        return;
      }

      // Check if bookings exist for this screen
      const hasBookings = DB.bookings.some(
        (b) => b.screenId === req.params.id && b.bookingStatus === 'confirmed'
      );
      if (hasBookings) {
        res.status(400).json({ success: false, message: 'Cannot delete screen with active bookings.' });
        return;
      }

      const deleted = DB.screens.splice(screenIndex, 1)[0];
      // Remove from theatre
      const theatre = DB.theatres.find((t) => t._id === deleted.theatreId);
      if (theatre) {
        theatre.screens = theatre.screens.filter((id) => id !== deleted._id);
      }
      // Remove showtimes
      for (let i = DB.showtimes.length - 1; i >= 0; i--) {
        if (DB.showtimes[i].screenId === req.params.id) {
          DB.showtimes.splice(i, 1);
        }
      }

      saveDb();
      res.json({ success: true, message: 'Screen deleted.', screen: deleted });
    } catch (error) {
      console.error('Error deleting screen:', error);
      res.status(500).json({ success: false, message: 'Failed to delete screen.' });
    }
  }
);

export default router;
