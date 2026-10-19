import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';

interface AdminAuthCardProps {
  onSuccess: () => void;
  onBack?: () => void;
}

/**
 * Admin authentication barrier component.
 * Adheres strictly to GEMINI.md design standards: flat, restrained SaaS aesthetic.
 */
export default function AdminAuthCard({ onSuccess, onBack }: AdminAuthCardProps) {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const ADMIN_PASSWORD = 'admin2026';

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      setPasswordError('');
      onSuccess();
    } else {
      setPasswordError('Invalid admin password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-xl p-7 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2.5">
          <div className="w-11 h-11 bg-slate-800 text-slate-300 rounded-xl flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Command Center</h1>
          <p className="text-sm text-slate-400">
            Restricted area for platform administrators. Enter access password below.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="bg-red-950/40 border border-red-800 text-red-400 p-3 rounded-lg text-sm text-center">
              {passwordError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Access Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-base text-white outline-none focus:border-indigo-500 font-mono transition-colors duration-120"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Default password: <code className="text-indigo-400 font-mono">admin2026</code>
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors duration-120 flex items-center justify-center gap-2 cursor-pointer border-0"
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock Console</span>
          </button>

          {(window.location.pathname === '/admin' || window.location.hash.includes('admin')) && (
            <button
              type="button"
              onClick={() => onBack ? onBack() : (window.location.href = '/')}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg text-sm font-medium transition-colors duration-120 cursor-pointer border-0"
            >
              Back to Website
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
