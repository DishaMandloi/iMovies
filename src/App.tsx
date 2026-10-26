import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';

// Pages
import { HomePage } from './pages/HomePage.js';
import { MoviesPage } from './pages/MoviesPage.js';
import { MovieDetailsPage } from './pages/MovieDetailsPage.js';
import { SeatSelectionPage } from './pages/SeatSelectionPage.js';
import { CheckoutPage } from './pages/CheckoutPage.js';
import { BookingConfirmationPage } from './pages/BookingConfirmationPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { MyBookingsPage } from './pages/MyBookingsPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

// Admin
import { AdminLayout } from './pages/admin/AdminLayout.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AdminMovies } from './pages/admin/AdminMovies.js';
import { AdminTheatres } from './pages/admin/AdminTheatres.js';
import { AdminScreens } from './pages/admin/AdminScreens.js';
import { AdminShowtimes } from './pages/admin/AdminShowtimes.js';
import { AdminBookings } from './pages/admin/AdminBookings.js';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-rose-600 selection:text-white">
          <Navbar />
          <div className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/movies" element={<MoviesPage />} />
              <Route path="/movies/:id" element={<MovieDetailsPage />} />
              <Route path="/showtimes/:id/seats" element={<SeatSelectionPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/booking-confirmation/:id" element={<BookingConfirmationPage />} />

              {/* Authentication */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* User Account */}
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route path="/my-bookings/:id" element={<BookingConfirmationPage />} />

              {/* Protected Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="movies" element={<AdminMovies />} />
                <Route path="theatres" element={<AdminTheatres />} />
                <Route path="screens" element={<AdminScreens />} />
                <Route path="showtimes" element={<AdminShowtimes />} />
                <Route path="bookings" element={<AdminBookings />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
