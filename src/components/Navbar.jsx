import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const { pathname } = useLocation();
  const isSignUp = pathname === '/signup';

  return (
    <nav className="sticky top-0 z-30 border-b border-white/[0.06] bg-[var(--ochi-bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-sm font-semibold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[10px] font-bold tracking-tight text-[var(--ochi-accent)]">
            O.
          </span>
          <span>ochi.live</span>
        </Link>

        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-slate-500 sm:inline">{isSignUp ? 'Already a member?' : 'New to Ochi?'}</span>
          <Link className="rounded-lg border border-white/10 px-3.5 py-2 font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white sm:px-4" to={isSignUp ? '/login' : '/signup'}>
            {isSignUp ? 'Sign in' : 'Create account'}
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
