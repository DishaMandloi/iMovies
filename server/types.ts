export type UserRole = 'user' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export type MovieStatus = 'currently showing' | 'upcoming';

export interface Movie {
  _id: string;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  genre: string[];
  language: string[];
  duration: number; // in minutes
  rating: number; // 0 - 10
  releaseDate: string; // YYYY-MM-DD
  cast: string[];
  director?: string;
  status: MovieStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SeatDefinition {
  seatNumber: string; // e.g. "A1", "A2", "B5"
  row: string; // "A", "B", ...
  number: number; // 1, 2, ...
  tier: 'Standard' | 'Premium' | 'VIP';
  priceMultiplier: number; // e.g. 1.0, 1.25, 1.5
}

export interface SeatLayout {
  rows: string[];
  seatsPerRow: number;
  seats: SeatDefinition[];
}

export interface Screen {
  _id: string;
  theatreId: string;
  name: string; // e.g. "Screen 1 - IMAX Laser"
  screenType: 'IMAX' | 'Dolby Atmos' | 'Standard 4K' | 'VIP Lounge';
  totalSeats: number;
  seatLayout: SeatLayout;
  createdAt: string;
  updatedAt: string;
}

export interface Theatre {
  _id: string;
  name: string;
  address: string;
  city: string;
  screens: string[]; // Screen IDs
  amenities: string[];
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Showtime {
  _id: string;
  movieId: string;
  theatreId: string;
  screenId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "14:30"
  endTime: string; // "17:00"
  ticketPrice: number; // base price
  status: 'active' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface BookingSeat {
  seatNumber: string;
  tier: 'Standard' | 'Premium' | 'VIP';
  price: number;
}

export interface Booking {
  _id: string;
  bookingReference: string; // e.g. "IMOV-984210"
  userId: string;
  movieId: string;
  theatreId: string;
  screenId: string;
  showtimeId: string;
  seats: BookingSeat[];
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  bookingStatus: 'confirmed' | 'cancelled';
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeatLock {
  _id: string;
  showtimeId: string;
  seatNumbers: string[];
  userId: string;
  expiresAt: string; // ISO String
  createdAt: string;
}
