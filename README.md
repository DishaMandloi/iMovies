# IMovies – Online Movie Ticket Booking Platform

IMovies is a full-stack, responsive, and production-grade online movie ticket booking platform built with **React.js**, **Node.js**, **Express.js**, and an atomic persistent database engine.

---

## 🌟 Key Features

1. **Movie Discovery & Catalog**
   - Search by title, director, or cast with instant debounced filters.
   - Filter by genre (`Sci-Fi`, `Action`, `Drama`, `Animation`, etc.), language, and release status (`Now Showing` vs `Upcoming`).
   - Sort by latest release date, highest rating, or alphabetical order.

2. **Theatres & Showtime Scheduling**
   - Venues equipped with 4K Laser IMAX, Dolby Atmos 12.1, and VIP Recliners.
   - Conflict-free showtime scheduling that prevents overlapping screenings in the same auditorium.
   - 6-day upcoming schedule matrix.

3. **Interactive Visual Cinema Seat Selection**
   - Ambient illuminated curved cinema screen view with projection glow.
   - Standard, Premium, and VIP Recliner seat tiers with dynamic multiplier pricing.
   - **Real-Time Seat Locks**: Temporarily locks selected seats for 10 minutes with live countdown to prevent double-booking.
   - Automatic background release for expired holds.
   - Atomic Mutex lock preventing race conditions under high concurrent demand.

4. **Streamlined Checkout & Digital Passes**
   - Itemized booking cost breakdown including tickets and convenience fees.
   - Sandbox Demo Payment Simulator (Credit Card, Digital Cinema Wallet, UPI).
   - High-fidelity digital admission pass with unique reference code (e.g., `IMOV-829104`), barcodes, and print/save functionality.

5. **Customer Booking Management & Cancellation**
   - User booking history showing active and past reservations.
   - Real-time cancellation permitted up to 2 hours prior to screening, instantly refunding the demo charge and releasing the seats back to the public pool.

6. **Comprehensive Admin Management Console**
   - Box office analytics: gross revenue, total tickets reserved, active showtimes, registered guests.
   - Full CRUD management for Movies, Theatres, Screens, and Showtimes.
   - Booking audit logs and search by guest email or reference code.
   - One-click Sample Data Reset button for testing.

---

## 🔐 Demo Credentials

The platform is pre-seeded with realistic movies, theatres, screens, and accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@imovies.com` | `admin123` | Full CRUD on movies, auditoriums, showtimes, bookings & analytics |
| **Demo User** | `user@imovies.com` | `user123` | Browsing, seat selection, booking, and cancellation |

*(Quick-fill buttons are provided on the Login screen for 1-click authentication)*

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### 2. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 3. Environment Setup
Copy the sample configuration:
```bash
cp .env.example .env
```
Key variables:
- `PORT`: Server port (default: `3000`)
- `JWT_SECRET`: Secret key for signing JSON Web Tokens

### 4. Running the Platform
Start the unified full-stack server (runs both Express REST APIs and Vite React frontend on port 3000):
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register` — Create a new customer account
- `POST /api/auth/login` — Sign in and receive JWT token
- `POST /api/auth/logout` — Clear session cookie
- `GET /api/auth/me` — Retrieve current authenticated profile

### Movies
- `GET /api/movies` — List movies with search, genre, language, status filters and sorting
- `GET /api/movies/:id` — Movie details, director, cast, and venue showtimes
- `POST /api/movies` — *Admin:* Create a new film entry
- `PUT /api/movies/:id` — *Admin:* Update movie metadata
- `DELETE /api/movies/:id` — *Admin:* Delete movie (if no active bookings)

### Theatres & Screens
- `GET /api/theatres` — List all theatre complexes and auditorium counts
- `GET /api/theatres/:id` — Theatre details with associated screens
- `POST /api/theatres` — *Admin:* Add a new cinema venue
- `PUT /api/theatres/:id` — *Admin:* Update venue info
- `DELETE /api/theatres/:id` — *Admin:* Delete theatre
- `POST /api/screens` — *Admin:* Configure screen layout (rows, seats per row, technology)
- `PUT /api/screens/:id` — *Admin:* Update screen settings
- `DELETE /api/screens/:id` — *Admin:* Remove screen

### Showtimes & Seat Availability
- `GET /api/showtimes` — Query showtimes by movie, theatre, date
- `GET /api/showtimes/:id` — Detailed showtime record
- `POST /api/showtimes` — *Admin:* Schedule screening with overlap validation
- `PUT /api/showtimes/:id` — *Admin:* Reschedule showtime
- `DELETE /api/showtimes/:id` — *Admin:* Delete showtime
- `GET /api/showtimes/:id/seats` — Real-time seat blueprint with status (`available`, `selected`, `booked`, `locked`)
- `POST /api/bookings/lock-seats` — Hold seats for 10 minutes during checkout
- `DELETE /api/bookings/lock-seats` — Release hold on seats

### Bookings
- `POST /api/bookings` — Atomically finalize booking and issue reference code
- `GET /api/bookings/my` — Current customer's reservation history
- `GET /api/bookings/:id` — Admission pass details
- `PATCH /api/bookings/:id/cancel` — Cancel future booking and refund
- `GET /api/admin/bookings` — *Admin:* Search all customer bookings

### Admin Analytics
- `GET /api/admin/stats` — Box office revenue, tickets sold, occupancy
- `GET /api/admin/users` — Registered customer accounts
- `POST /api/admin/reset-seed` — Reset database to pristine state

---

## 🔒 Concurrency & Seat Locking

To guarantee that seats cannot be double-booked:
1. **10-Minute Lock Protocol**: When a user selects seats, `POST /api/bookings/lock-seats` locks those seats for that specific user. Other users see them marked as `Held`.
2. **Mutex Guarding**: The reservation and lock engine processes requests sequentially using asynchronous mutex locks, eliminating race conditions.
3. **Double Revalidation**: When final payment is processed, the system verifies once more that no requested seat was booked in the interim.
