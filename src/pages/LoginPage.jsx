import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BrandedLoader from '../components/BrandedLoader';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const buildApiUrl = (path) => {
  const base = API_BASE_URL;
  return `${base}${base.endsWith('/api') ? '' : '/api'}${path}`;
};

const getErrorMessage = (error) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;

  if (status === 404) {
    return 'The login endpoint could not be reached. Please make sure the backend server is running.';
  }

  if (message && message !== 'Network Error') {
    return message;
  }

  return 'Unable to sign in right now. Please check that the backend is running and try again.';
};

import { persistSession } from '../utils/session';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identity: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoogleLogin = async () => {
    window.location.assign(buildApiUrl('/auth/google/start'));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(buildApiUrl('/auth/login'), form);
      persistSession(response.data.token, response.data.user);
      setMessage(response.data.message);
      setTransitioning(true);
      window.setTimeout(() => {
        const from = location.state?.from;
        const destination = typeof from?.pathname === 'string' && from.pathname.startsWith('/') && !from.pathname.startsWith('//')
          ? `${from.pathname}${from.search || ''}${from.hash || ''}`
          : '/home';
        navigate(destination, { replace: true });
      }, 1800);
    } catch (error) {
      setMessage(getErrorMessage(error));
      setLoading(false);
      window.setTimeout(() => {
        setLoading(false);
      }, 600);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ochi-bg)] text-[var(--ochi-text)]">

      <Navbar />
      <BrandedLoader isVisible={transitioning} label="Opening your dashboard..." />

      <main className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <section className="w-full max-w-[420px] rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:rounded-3xl sm:p-8">
            <h1 className="mb-7 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Sign in</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block text-sm font-medium text-slate-300">
                Email or username
                <input
                  name="identity"
                  type="text"
                  value={form.identity}
                  onChange={handleChange}
                  autoComplete="username"
                  placeholder="Email or username"
                  className="mt-2.5 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--ochi-accent)]/70 focus:bg-black/30 focus:ring-2 focus:ring-[var(--ochi-accent)]/15"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-300">
                Password
                <div className="relative mt-2">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    placeholder="Password"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-16 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--ochi-accent)]/70 focus:bg-black/30 focus:ring-2 focus:ring-[var(--ochi-accent)]/15"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1 text-xs font-medium text-slate-400 transition hover:text-white"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-rose-500/30" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-[var(--ochi-accent-light)] transition hover:text-white">
                  Forgot password?
                </Link>
              </div>

              {message ? (
                <div className={`rounded-lg border px-4 py-3 text-sm ${message.toLowerCase().includes('success') || message.toLowerCase().includes('successful') ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                  <p>{message}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[var(--ochi-accent-strong)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--ochi-accent-strong)]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>           
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
              <div className="h-px flex-1 bg-white/[0.08]" />
              or
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            <button type="button" onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
              <span aria-hidden="true" className="font-semibold">G</span>
              Continue with Google
            </button>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
