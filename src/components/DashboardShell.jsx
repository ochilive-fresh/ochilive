import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import messageApi from '../api/messageApi';
import { getNotifications } from '../api/dashboardApi';
import { isAuthenticated } from '../utils/session';

const navItems = [
  { label: 'Home', path: '/home', icon: 'home' },
  { label: 'Discover', path: '/discover', icon: 'search' },
  { label: 'Notifications', path: '/notifications', icon: 'bell' },
  { label: 'Profile', path: '/profile', icon: 'user' },
];

function Icon({ name, className }) {
  switch (name) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M3 11.5L12 3l9 8.5V20a1 1 0 0 1-1 1h-5v-5H9v5H4a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'search':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="10" cy="10" r="6.25" stroke="currentColor" strokeWidth="2.8" />
          <path d="M15.4 15.4l3.2 3.2" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M14.5 10a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z" stroke="none" fill="currentColor" fillOpacity="0.04" />
        </svg>
      );
    case 'upload':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M12 3v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="m8 7 4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case 'user':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="2.8" />
          <path d="M6 20c0-3.333 2.667-6 6-6s6 2.667 6 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    case 'activity':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M3 12h4l3-8 4 16 3-8h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M5 7.5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M6 11h3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M15 11h2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'message':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'bell':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 3.73-1.5 6-3 6h18c-1.5 0-3-2.27-3-6Z" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function DashboardShell({
  title,
  subtitle,
  children,
  homeHeaderCenter,
  homeHeaderAction,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  onSearchKeyDown,
  searchInputRef,
  showSearch = true,
  showBack = false,
  backFallback = '/home',
  searchPlaceholder = 'Search creators by name or username',
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const isHome = location.pathname === '/' || location.pathname === '/home';
  const isProfileRoute = location.pathname === '/profile' || location.pathname.startsWith('/profile/');
  const isSettingsRoute = location.pathname === '/settings';
  const isProfileToolbarRoute = isProfileRoute || isSettingsRoute;

  useEffect(() => {
    if (!isAuthenticated()) {
      setInboxUnreadCount(0);
      return undefined;
    }

    let ignore = false;

    const refreshMessageCount = async () => {
      const [messages, notifications] = await Promise.allSettled([
        messageApi.getUnreadCount(),
        getNotifications('all'),
      ]);
      if (ignore) return;

      const messageCount = messages.status === 'fulfilled' ? Number(messages.value?.unreadCount || 0) : 0;
      const notificationCount = notifications.status === 'fulfilled' ? Number(notifications.value?.unreadCount || 0) : 0;
      setInboxUnreadCount(messageCount + notificationCount);
    };

    refreshMessageCount();
    const timer = window.setInterval(refreshMessageCount, 30000);

    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [location.pathname]);

  const handleKeyDown = (event) => {
    if (typeof onSearchKeyDown === 'function') {
      onSearchKeyDown(event);
      return;
    }

    if (event.key === 'Enter' && typeof onSearchSubmit === 'function') {
      event.preventDefault();
      onSearchSubmit(event);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ochi-bg)] text-[var(--ochi-text)]">
      <div className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.07] bg-[var(--ochi-bg)]/90 backdrop-blur-2xl lg:left-64">
        {isHome ? (
          <div className="mx-auto grid h-12 max-w-[1360px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-8 lg:px-10">
            <Link to="/home" aria-label="Ochi Live home" className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ochi-accent)] text-sm font-black tracking-tighter text-white sm:h-10 sm:w-10">O.</Link>
            <div className="flex min-w-0 justify-center">{homeHeaderCenter}</div>
            <div className="flex justify-end">
              {homeHeaderAction || (
                <Link
                  to="/upload"
                  aria-label="Create a post"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ochi-accent-strong)] text-white transition hover:bg-[var(--ochi-accent)] sm:h-10 sm:w-auto sm:gap-2 sm:px-4"
                >
                  <Icon name="plus" className="h-5 w-5" />
                  <span className="hidden text-sm font-semibold sm:inline">Upload</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between gap-2 px-3 sm:gap-3 sm:px-8 lg:px-10">
              {showBack ? (
                <button
                  type="button"
                  onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(backFallback))}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-slate-300 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-300/30"
                  aria-label="Go back"
                  title="Go back"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path d="m15 5-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : <span className="hidden sm:block" />}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-sm font-semibold text-white sm:text-base">{title}</h1>
                {subtitle ? <p className="hidden truncate text-xs text-slate-400 sm:block">{subtitle}</p> : null}
              </div>
              {isProfileToolbarRoute ? (
                <div className="flex shrink-0 items-center justify-end">
                  <Link
                    to="/settings"
                    className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300/30"
                    aria-label="Profile settings"
                  >
                    <Icon name="settings" className="h-5 w-5 transition-transform group-hover:rotate-12" />
                  </Link>
                </div>
              ) : showSearch ? (
                <div className="flex min-w-0 flex-1 items-center justify-end">
                  <div className="flex w-full max-w-xl min-w-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 transition focus-within:border-[var(--ochi-accent-40)] sm:gap-3 sm:px-4">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500" aria-hidden="true">
                      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
                      <path d="m16 16 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchValue}
                      onChange={(event) => onSearchChange?.(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={searchPlaceholder}
                      className="min-w-0 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : null}
            </div>
        )}
      </div>

      <main className={`mx-auto max-w-6xl px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] ${isHome ? 'pt-14 sm:pt-16' : 'pt-[5.5rem] sm:pt-24'} sm:px-6 sm:pb-28 lg:mx-0 lg:ml-64 lg:max-w-none lg:px-0 lg:pt-20`}>
        <div className="mx-auto w-full max-w-[1360px] space-y-5 px-1 sm:space-y-7 sm:px-2 lg:px-10">{children}</div>
      </main>

      <nav aria-label="Main navigation" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-transparent pb-[env(safe-area-inset-bottom)] lg:pointer-events-auto lg:inset-y-0 lg:left-0 lg:right-auto lg:w-64 lg:border-r lg:border-white/[0.08] lg:bg-[#0b0c0f]/90 lg:pb-0">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 pb-4 pt-3 sm:gap-4 lg:flex lg:h-full lg:flex-col lg:items-stretch lg:justify-start lg:gap-3 lg:px-5 lg:py-7">
          <Link to="/home" className="mb-7 hidden items-center gap-3 rounded-2xl px-3 py-2 lg:flex" aria-label="Ochi Live home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ochi-accent)] text-lg font-black tracking-tighter text-white">O.</span>
          </Link>
          <p className="mb-2 hidden px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600 lg:block">Your space</p>
          {navItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.path === '/notifications' ? 'Inbox and notifications' : item.label}
                className={({ isActive }) =>
                  `group pointer-events-auto relative inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-white/[0.12] bg-white/[0.09] text-white shadow-[0_8px_22px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/[0.2] hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ochi-accent-light)] lg:h-auto lg:min-h-12 lg:w-full lg:justify-start lg:gap-3 lg:rounded-xl lg:border-white/[0.07] lg:bg-white/[0.025] lg:px-3 lg:py-2.5 lg:text-sm lg:shadow-none lg:backdrop-blur-none lg:hover:translate-y-0 lg:hover:bg-white/[0.06] ${
                    isActive ? 'border-[var(--ochi-accent-40)] bg-white/[0.17] text-white shadow-[0_10px_26px_rgba(0,0,0,0.4)] lg:bg-white/[0.08] lg:font-semibold' : 'lg:text-slate-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`inline-flex shrink-0 items-center justify-center ${isActive ? 'text-[var(--ochi-accent-light)] lg:text-[var(--ochi-accent-light)]' : 'text-white lg:text-slate-400'}`}>
                      <Icon name={item.icon} className="h-7 w-7 transition-transform group-active:scale-90 lg:h-5 lg:w-5" />
                    </span>
                    <span className="sr-only truncate leading-4 lg:not-sr-only lg:text-sm">{item.label}</span>
                    {isActive && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-[var(--ochi-accent-light)] lg:hidden" aria-hidden="true" />}
                    {item.path === '/notifications' && inboxUnreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white ring-2 ring-[#0b0c0f] lg:right-3 lg:top-1/2 lg:-translate-y-1/2">
                        {inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
          <div className="mt-auto hidden border-t border-white/[0.07] pt-5 lg:block">
            <p className="px-3 text-xs leading-5 text-slate-500">A little stage for the moments worth sharing.</p>
            <Link to="/discover" className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--ochi-accent-light)] transition hover:text-white">
              Explore Ochi <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
