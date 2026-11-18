import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BrandedLoader from '../components/BrandedLoader';
import { persistSession } from '../utils/session';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const buildApiUrl = (path) => {
  const base = API_BASE_URL;
  return `${base}${base.endsWith('/api') ? '' : '/api'}${path}`;
};

const getErrorMessage = (error) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;

  if (status === 404) {
    return 'The signup endpoint could not be reached. Please make sure the backend server is running.';
  }

  if (status === 409) {
    return 'That email or username is already in use.';
  }

  if (message && message !== 'Network Error') {
    return message;
  }

  return 'Unable to create your account right now. Please check that the backend is running and try again.';
};

const getPasswordStrength = (password) => {
  const checks = [
    { label: '8+ characters', passed: password.length >= 8 },
    { label: 'lowercase', passed: /[a-z]/.test(password) },
    { label: 'uppercase', passed: /[A-Z]/.test(password) },
    { label: 'number', passed: /\d/.test(password) },
    { label: 'symbol', passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const passedCount = checks.filter((item) => item.passed).length;
  const score = password ? Math.round((passedCount / checks.length) * 100) : 0;

  if (!password) {
    return { score, label: 'At least 8 characters', barClass: 'bg-slate-700', textClass: 'text-slate-500' };
  }

  if (score < 40) {
    return { score, label: 'Add a few more character types', barClass: 'bg-[var(--ochi-accent)]', textClass: 'text-[var(--ochi-accent-light)]' };
  }

  if (score < 80) {
    return { score, label: 'Good', barClass: 'bg-amber-500', textClass: 'text-amber-300' };
  }

  return { score, label: 'Strong', barClass: 'bg-emerald-500', textClass: 'text-emerald-300' };
};

function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ state: 'idle', message: '', suggestions: [] });
  const passwordStrength = getPasswordStrength(form.password);

  useEffect(() => {
    const username = form.username.trim().toLowerCase();
    if (!username) {
      setUsernameStatus({ state: 'idle', message: '', suggestions: [] });
      return undefined;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setUsernameStatus({ state: 'invalid', message: 'Use 3-24 letters, numbers, or underscores.', suggestions: [] });
      return undefined;
    }

    const controller = new AbortController();
    setUsernameStatus({ state: 'checking', message: 'Checking availability...', suggestions: [] });
    const timer = window.setTimeout(async () => {
      try {
        const response = await axios.get(buildApiUrl('/auth/username-availability'), { params: { username }, signal: controller.signal });
        const data = response.data;
        setUsernameStatus({
          state: data.available ? 'available' : data.reason === 'reserved' ? 'reserved' : 'taken',
          message: data.available ? 'Username is available.' : data.reason === 'reserved' ? 'This username is reserved by Ochi Live.' : 'That username is already taken.',
          suggestions: data.suggestions || [],
        });
      } catch (error) {
        if (error.name !== 'CanceledError' && error.name !== 'AbortError') setUsernameStatus({ state: 'error', message: 'Availability check unavailable. You can still try to continue.', suggestions: [] });
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.username]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === 'username' ? value.toLowerCase().replace(/\s/g, '') : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post(buildApiUrl('/auth/register'), form);
      persistSession(response.data.token, response.data.user);
      setTransitioning(true);
      window.setTimeout(() => {
        navigate('/home');
      }, 1800);
    } catch (error) {
      setMessage(getErrorMessage(error));
      setLoading(false);
      window.setTimeout(() => {
        setLoading(false);
      }, 600);
    }
  };

  const handleGoogleSignup = async () => {
    window.location.assign(buildApiUrl('/auth/google/start'));
  };

  return (
    <div className="min-h-screen bg-[var(--ochi-bg)] text-[var(--ochi-text)]">

      <Navbar />
      <BrandedLoader isVisible={transitioning} label="Creating your account..." />

      <main className="relative mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <section className="w-full max-w-[440px] rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:rounded-3xl sm:p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Create account</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Username
                    <input
                      name="username"
                      type="text"
                      value={form.username}
                      onChange={handleChange}
                      autoComplete="username"
                      placeholder="Username"
                      pattern="[a-z0-9_]{3,24}"
                      className="mt-2.5 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--ochi-accent)]/70 focus:bg-black/30 focus:ring-2 focus:ring-[var(--ochi-accent)]/15"
                      required
                    />
                    {usernameStatus.message ? (
                      <p className={`mt-2 text-xs ${usernameStatus.state === 'available' ? 'text-emerald-300' : usernameStatus.state === 'checking' ? 'text-slate-400' : 'text-[var(--ochi-accent-light)]'}`}>
                        {usernameStatus.message}
                      </p>
                    ) : null}
                    {usernameStatus.suggestions.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {usernameStatus.suggestions.map((suggestion) => (
                          <button key={suggestion} type="button" onClick={() => setForm((prev) => ({ ...prev, username: suggestion }))} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white">
                            @{suggestion}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>

                  <label className="block text-sm font-medium text-slate-300">
                    Email address
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                      placeholder="you@example.com"
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
                        autoComplete="new-password"
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
                    <div className="mt-2.5 space-y-1.5">
                      <div className="h-1 overflow-hidden rounded-full bg-black/40">
                        <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.barClass}`} style={{ width: `${passwordStrength.score}%` }} />
                      </div>
                      <p className={`text-[11px] sm:text-xs ${passwordStrength.textClass}`}>{passwordStrength.label}</p>
                    </div>
                  </label>

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
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
              <div className="h-px flex-1 bg-white/[0.08]" />
              or
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>
            <button type="button" onClick={handleGoogleSignup} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
              <span aria-hidden="true" className="font-semibold">G</span>
              Continue with Google
            </button>
        </section>
      </main>
    </div>
  );
}

export default SignUpPage;
