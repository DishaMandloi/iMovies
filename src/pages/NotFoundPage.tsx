import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center space-y-4">
      <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-rose-500 shadow-xl">
        <Film className="w-8 h-8" />
      </div>
      <span className="text-xs font-mono font-bold text-rose-500 tracking-widest uppercase">
        404 ERROR
      </span>
      <h1 className="text-3xl font-black text-white">Scene Missing / Page Not Found</h1>
      <p className="text-xs text-slate-400 max-w-sm">
        The reel you're looking for seems to have been cut from the final screening.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-rose-600/30 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
};
