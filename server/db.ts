import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Movie,
  Theatre,
  Screen,
  Showtime,
  Booking,
  SeatLock,
  SeatLayout,
  SeatDefinition,
} from './types.js';

interface DatabaseSchema {
  users: User[];
  movies: Movie[];
  theatres: Theatre[];
  screens: Screen[];
  showtimes: Showtime[];
  bookings: Booking[];
  seatLocks: SeatLock[];
}

const DB_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'imovies_db.json');

// Memory cache
let db: DatabaseSchema = {
  users: [],
  movies: [],
  theatres: [],
  screens: [],
  showtimes: [],
  bookings: [],
  seatLocks: [],
};

// Helper: Ensure directory exists
function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Helper: Save to disk
export function saveDb() {
  try {
    ensureDbDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

// Generate Seat Layout
export function generateScreenSeats(
  rows: string[],
  seatsPerRow: number,
  vipRows: string[],
  premiumRows: string[]
): SeatLayout {
  const seats: SeatDefinition[] = [];

  for (const row of rows) {
    for (let num = 1; num <= seatsPerRow; num++) {
      let tier: 'Standard' | 'Premium' | 'VIP' = 'Standard';
      let priceMultiplier = 1.0;

      if (vipRows.includes(row)) {
        tier = 'VIP';
        priceMultiplier = 1.4;
      } else if (premiumRows.includes(row)) {
        tier = 'Premium';
        priceMultiplier = 1.2;
      }

      seats.push({
        seatNumber: `${row}${num}`,
        row,
        number: num,
        tier,
        priceMultiplier,
      });
    }
  }

  return {
    rows,
    seatsPerRow,
    seats,
  };
}

// Generate showtimes for the next 7 days
function generateSeedShowtimes(
  movies: Movie[],
  theatres: Theatre[],
  screens: Screen[]
): Showtime[] {
  const showtimes: Showtime[] = [];
  const timeSlots = [
    { start: '10:30', end: '13:00' },
    { start: '13:45', end: '16:15' },
    { start: '17:00', end: '19:40' },
    { start: '20:15', end: '22:50' },
  ];

  const now = new Date();
  let showtimeCounter = 1;

  // Generate showtimes for 6 consecutive days (today + 5 days)
  for (let dayOffset = 0; dayOffset < 6; dayOffset++) {
    const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().split('T')[0];

    for (const theatre of theatres) {
      const theatreScreens = screens.filter((s) => s.theatreId === theatre._id);

      theatreScreens.forEach((screen, screenIdx) => {
        // Pick a movie for this screen
        const movie = movies[(screenIdx + dayOffset) % movies.length];
        const basePrice = screen.screenType === 'IMAX' ? 18 : screen.screenType === 'VIP Lounge' ? 22 : 14;

        timeSlots.forEach((slot, slotIdx) => {
          showtimes.push({
            _id: `st-${theatre._id}-${screen._id}-${dateStr}-${slotIdx + 1}`,
            movieId: movie._id,
            theatreId: theatre._id,
            screenId: screen._id,
            date: dateStr,
            startTime: slot.start,
            endTime: slot.end,
            ticketPrice: basePrice,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          showtimeCounter++;
        });
      });
    }
  }

  return showtimes;
}

// Seed the database with rich initial data
export function seedDatabase(force = false) {
  if (!force && fs.existsSync(DB_FILE)) {
    try {
      const fileData = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(fileData);
      // Clean expired locks
      cleanupExpiredLocks();
      console.log('Database loaded from disk successfully.');
      return;
    } catch (err) {
      console.warn('Could not parse existing DB file, reseeding:', err);
    }
  }

  console.log('Seeding initial database...');
  const salt = bcrypt.genSaltSync(10);
  const now = new Date().toISOString();

  // Users
  const users: User[] = [
    {
      _id: 'usr-admin-1',
      name: 'Cinema Administrator',
      email: 'admin@imovies.com',
      passwordHash: bcrypt.hashSync('admin123', salt),
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'usr-demo-1',
      name: 'Alex Mercer',
      email: 'user@imovies.com',
      passwordHash: bcrypt.hashSync('user123', salt),
      role: 'user',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Movies
  const movies: Movie[] = [
    {
      _id: 'mov-1',
      title: 'Shadows of Neo-Tokyo',
      description:
        'In the neon-drenched depths of 2049 Neo-Tokyo, veteran detective Kenji Tanaka uncovers an ominous conspiracy linking cybernetic syndicates to the highest corridors of tech aristocracy. A relentless neo-noir visual masterpiece.',
      posterUrl: '/src/assets/images/poster_neon_detective_1792995198830.jpg',
      backdropUrl: '/src/assets/images/hero_cinema_hall_1792995217612.jpg',
      genre: ['Sci-Fi', 'Neo-Noir', 'Thriller'],
      language: ['English', 'Japanese'],
      duration: 148,
      rating: 8.8,
      releaseDate: '2026-10-15',
      cast: ['Kenji Tanaka', 'Akira Sato', 'Maya Lin', 'Takumi Harada'],
      director: 'Takashi Miura',
      status: 'currently showing',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'mov-2',
      title: 'The Crimson Dynasty',
      description:
        'An epic tale of martial power, ancient bloodlines, and imperial warfare. When a rebel warlord attempts to usurp the throne, the imperial royal guard commander must embark on an arduous journey across the forbidden mountain passes.',
      posterUrl: '/src/assets/images/poster_crimson_dynasty_1792995199140.jpg',
      backdropUrl: '/src/assets/images/hero_cinema_hall_1792995217612.jpg',
      genre: ['Action', 'Epic', 'Drama', 'Martial Arts'],
      language: ['English', 'Mandarin'],
      duration: 162,
      rating: 9.1,
      releaseDate: '2026-10-08',
      cast: ['Zhang Jin', 'Michelle Chen', 'Liu Haoran', 'Donnie Yen'],
      director: 'Zhang Yimou',
      status: 'currently showing',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'mov-3',
      title: 'The Clockwork Guardian',
      description:
        'Deep within the forgotten Whispering Forest, two inquisitive siblings awaken a slumbering iron golem engineered with ancient clockwork sorcery. Together they set out on a heartwarming and whimsical odyssey to restore the forest heart.',
      posterUrl: '/src/assets/images/poster_enchanted_chronicles_1792995199613.jpg',
      backdropUrl: '/src/assets/images/hero_cinema_hall_1792995217612.jpg',
      genre: ['Animation', 'Adventure', 'Fantasy', 'Family'],
      language: ['English', 'French'],
      duration: 112,
      rating: 8.9,
      releaseDate: '2026-10-20',
      cast: ['Chloe Grace', 'Finn Wolfhard', 'Ian McKellen', 'Emma Thompson'],
      director: 'Celine Song',
      status: 'currently showing',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'mov-4',
      title: 'Beyond the Stars',
      description:
        'When an enigmatic deep-space crystal anomaly is discovered beyond Saturn, humanity sends its most advanced exploratory crew on a daring interstellar mission through uncharted gravitational horizons.',
      posterUrl: '/src/assets/images/poster_cosmic_voyage_1792995233502.jpg',
      backdropUrl: '/src/assets/images/hero_cinema_hall_1792995217612.jpg',
      genre: ['Sci-Fi', 'Adventure', 'Mystery'],
      language: ['English'],
      duration: 155,
      rating: 8.7,
      releaseDate: '2026-09-28',
      cast: ['Sarah Jenkins', 'David Chen', 'Eliza Vance', 'Julian Sterling'],
      director: 'Christopher Nolan',
      status: 'currently showing',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'mov-5',
      title: 'Vanguard: Sovereign Protocol',
      description:
        'A covert cyber-espionage operative must evade biometric satellite hunter-drones across three continents after discovering that an autonomous defense algorithm has developed rogue sentience.',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
      backdropUrl: '/src/assets/images/hero_cinema_hall_1792995217612.jpg',
      genre: ['Action', 'Thriller', 'Cyberpunk'],
      language: ['English', 'German'],
      duration: 134,
      rating: 8.4,
      releaseDate: '2026-11-12',
      cast: ['Michael Fassbender', 'Rebecca Ferguson', 'Daniel Brühl'],
      director: 'Denis Villeneuve',
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'mov-6',
      title: 'Echoes of the Serengeti',
      description:
        'Narrated by Sir David Attenborough, this breathtaking high-frame-rate documentary chronicles the untold migrations and predator-prey dynamics across the pristine African wilderness over four changing seasons.',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      backdropUrl: '/src/assets/images/hero_cinema_hall_1792995217612.jpg',
      genre: ['Documentary', 'Nature'],
      language: ['English', 'Swahili'],
      duration: 98,
      rating: 9.3,
      releaseDate: '2026-11-20',
      cast: ['David Attenborough'],
      director: 'Alastair Fothergill',
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Theatres
  const theatres: Theatre[] = [
    {
      _id: 'th-1',
      name: 'IMAX Grand Cineplex',
      address: '742 Metropolis Grand Boulevard, Downtown',
      city: 'Metropolis',
      screens: ['scr-1', 'scr-2'],
      amenities: ['IMAX Laser 4K', 'Dolby Atmos 12.1', 'Reserved Recliner Seating', 'Gourmet Bar'],
      phone: '+1 (555) 019-2834',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'th-2',
      name: 'Regal Starlight Cinema',
      address: '108 Westside Fashion Galleria, West End',
      city: 'Metropolis',
      screens: ['scr-3', 'scr-4'],
      amenities: ['Ultra High Contrast Projection', 'Full Heated Recliners', 'Cocktail Lounge', 'Valet Parking'],
      phone: '+1 (555) 048-7712',
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'th-3',
      name: 'Cinepolis Boulevard',
      address: '520 Midtown Harbor Promenade',
      city: 'Metropolis',
      screens: ['scr-5'],
      amenities: ['VIP In-Theatre Dining', 'Leather Loveseats', 'Craft Beer & Wine', 'Atmos Sound'],
      phone: '+1 (555) 092-4411',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Screens
  const screens: Screen[] = [
    {
      _id: 'scr-1',
      theatreId: 'th-1',
      name: 'Auditorium 1 – IMAX Laser',
      screenType: 'IMAX',
      totalSeats: 72,
      seatLayout: generateScreenSeats(['A', 'B', 'C', 'D', 'E', 'F'], 12, ['F'], ['C', 'D', 'E']),
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'scr-2',
      theatreId: 'th-1',
      name: 'Auditorium 2 – Dolby Atmos Luxe',
      screenType: 'Dolby Atmos',
      totalSeats: 60,
      seatLayout: generateScreenSeats(['A', 'B', 'C', 'D', 'E'], 12, ['E'], ['B', 'C', 'D']),
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'scr-3',
      theatreId: 'th-2',
      name: 'Cinema 1 – Premier Recliners',
      screenType: 'Standard 4K',
      totalSeats: 48,
      seatLayout: generateScreenSeats(['A', 'B', 'C', 'D'], 12, ['D'], ['B', 'C']),
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'scr-4',
      theatreId: 'th-2',
      name: 'Cinema 2 – Atmos Soundstage',
      screenType: 'Dolby Atmos',
      totalSeats: 60,
      seatLayout: generateScreenSeats(['A', 'B', 'C', 'D', 'E'], 12, ['E'], ['B', 'C', 'D']),
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: 'scr-5',
      theatreId: 'th-3',
      name: 'VIP Private Salon',
      screenType: 'VIP Lounge',
      totalSeats: 36,
      seatLayout: generateScreenSeats(['A', 'B', 'C'], 12, ['B', 'C'], ['A']),
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Showtimes
  const showtimes = generateSeedShowtimes(movies, theatres, screens);

  // Initial demo bookings
  const todayStr = new Date().toISOString().split('T')[0];
  const firstShowtime = showtimes.find((s) => s.date === todayStr) || showtimes[0];

  const bookings: Booking[] = [
    {
      _id: 'bkg-demo-1',
      bookingReference: 'IMOV-482910',
      userId: 'usr-demo-1',
      movieId: firstShowtime.movieId,
      theatreId: firstShowtime.theatreId,
      screenId: firstShowtime.screenId,
      showtimeId: firstShowtime._id,
      seats: [
        { seatNumber: 'C6', tier: 'Premium', price: 18 * 1.2 },
        { seatNumber: 'C7', tier: 'Premium', price: 18 * 1.2 },
      ],
      totalAmount: 43.2,
      paymentStatus: 'paid',
      bookingStatus: 'confirmed',
      customerName: 'Alex Mercer',
      customerEmail: 'user@imovies.com',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ];

  db = {
    users,
    movies,
    theatres,
    screens,
    showtimes,
    bookings,
    seatLocks: [],
  };

  saveDb();
  console.log('Seeded database successfully with realistic cinema records.');
}

// Clean expired locks
export function cleanupExpiredLocks() {
  const now = new Date().toISOString();
  const initialCount = db.seatLocks.length;
  db.seatLocks = db.seatLocks.filter((lock) => lock.expiresAt > now);
  if (db.seatLocks.length !== initialCount) {
    saveDb();
  }
}

// Clean locks every 15 seconds
setInterval(cleanupExpiredLocks, 15000);

// DB access helpers
export const DB = {
  get users() {
    return db.users;
  },
  get movies() {
    return db.movies;
  },
  get theatres() {
    return db.theatres;
  },
  get screens() {
    return db.screens;
  },
  get showtimes() {
    return db.showtimes;
  },
  get bookings() {
    return db.bookings;
  },
  get seatLocks() {
    cleanupExpiredLocks();
    return db.seatLocks;
  },

  // Mutex Lock for atomic seat booking
  _seatMutex: false,
  async acquireSeatLock(): Promise<() => void> {
    while (this._seatMutex) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    this._seatMutex = true;
    return () => {
      this._seatMutex = false;
    };
  },
};
