import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import LiveSection from '../components/discovery/LiveSection';
import UpcomingShowsSection from '../components/discovery/UpcomingShowsSection';
import PopularClipsSection from '../components/discovery/PopularClipsSection';
import RecommendedSection from '../components/discovery/RecommendedSection';
import FreshOnTheMicSection from '../components/discovery/FreshOnTheMicSection';
import { searchProfiles, followProfile, unfollowProfile } from '../api/dashboardApi';
import { getStoredSession } from '../utils/session';

const RECENT_SEARCH_KEY = 'ochi_recent_searches';

function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isSignedIn = Boolean(getStoredSession().token);
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const searches = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || '[]');
      return Array.isArray(searches) ? searches.filter((item) => typeof item === 'string').slice(0, 6) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (searchParams.get('focus') === 'search') {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    setSelectedResultIndex(0);
  }, [searchResults.length, searchTerm]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError('');
      return undefined;
    }
    if (!isSignedIn) {
      setSearchResults([]);
      setSearchError('Sign in to search creators on Ochi.');
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError('');
      try {
        const response = await searchProfiles(q);
        setSearchResults(response.results || []);
      } catch (error) {
        setSearchError(error?.response?.status === 401
          ? 'Sign in to search creators on Ochi.'
          : 'We could not search creators right now. Please try again.');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, isSignedIn]);

  const saveRecentSearch = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return;

    const next = [trimmed, ...recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try {
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
    } catch {
      // Recent searches improve the experience but are not required for search.
    }
  };

  const handleInputChange = (value) => {
    setSearchTerm(value);
  };

  const handleSearch = async (event) => {
    if (event) event.preventDefault();
    const q = searchTerm.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    if (!isSignedIn) {
      setSearchError('Sign in to search creators on Ochi.');
      setSearchResults([]);
      return;
    }

    saveRecentSearch(q);
    setSearchLoading(true);
    setSearchError('');
    try {
      const response = await searchProfiles(q);
      setSearchResults(response.results || []);
    } catch (error) {
      setSearchError(error?.response?.status === 401
        ? 'Sign in to search creators on Ochi.'
        : 'We could not search creators right now. Please try again.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (!searchTerm.trim()) {
      if (event.key === 'ArrowDown' && recentSearches.length) {
        event.preventDefault();
        setSelectedResultIndex(0);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedResultIndex((current) => Math.min(current + 1, Math.max(searchResults.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedResultIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (searchResults[selectedResultIndex]) {
        const selectedProfile = searchResults[selectedResultIndex];
        saveRecentSearch(selectedProfile.username);
        navigate(`/profile/${selectedProfile.username}`);
        return;
      }
      handleSearch(event);
    }
  };

  const handleFollowToggle = async (profile) => {
    try {
      const result = profile.isFollowing ? await unfollowProfile(profile.username) : await followProfile(profile.username);
      setSearchResults((current) => current.map((item) => (item.username === profile.username ? {
        ...item,
        isFollowing: Boolean(result.relationship?.isFollowing),
        stats: {
          ...item.stats,
          followers: result.stats?.followers ?? item.stats?.followers ?? 0,
        },
      } : item)));
    } catch {
      setSearchError('Unable to update that follow status right now.');
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCH_KEY);
    } catch {
      // Search remains usable when browser storage is unavailable.
    }
  };

  return (
      <DashboardShell
        title="Discover"
        subtitle="Find your next favorite creator"
        searchValue={searchTerm}
        searchPlaceholder={isSignedIn ? 'Search creators by name or username' : 'Sign in to search creators'}
        searchInputRef={searchInputRef}
        onSearchChange={handleInputChange}
        onSearchSubmit={handleSearch}
        onSearchKeyDown={handleSearchKeyDown}
      >
        <div className="mx-auto w-full max-w-[1180px]">
          {searchError ? (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] px-4 py-3 text-sm text-[var(--ochi-accent-light)]">
              <span>{searchError}</span>
              {searchError.startsWith('Sign in') ? <button type="button" onClick={() => navigate('/login')} className="rounded-full bg-[var(--ochi-accent-strong)] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--ochi-accent)]">Sign in</button> : null}
            </div>
          ) : null}

          {!searchTerm.trim() ? (
            <section className="relative mb-8 overflow-hidden rounded-[32px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_92%_6%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(ellipse_at_10%_100%,rgba(255,255,255,0.025),transparent_38%),linear-gradient(130deg,#17191f,#101115_70%)] px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
              <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border border-white/[0.05]" />
              <div className="absolute -right-2 -top-12 h-48 w-48 rounded-full border border-white/[0.05]" />
              <div className="relative max-w-2xl">
                <p className="ochi-kicker">Explore the Ochi universe</p>
                <h2 className="mt-4 max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-0.05em] text-white sm:text-5xl">
                  Find your people.<br /><span className="text-[var(--ochi-accent-light)]">Catch the moment.</span>
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                  Drop into a live set, discover a fresh voice, or save a clip worth passing around.
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {[
                    { label: 'Live now', target: 'discover-live' },
                    { label: 'Upcoming shows', target: 'discover-shows' },
                    { label: 'Popular clips', target: 'discover-clips' },
                    { label: 'Creators', target: 'discover-creators' },
                  ].map((item) => (
                    <a
                      key={item.target}
                      href={`#${item.target}`}
                      className="rounded-full border border-white/[0.12] bg-black/20 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-[var(--ochi-accent-40)] hover:bg-[var(--ochi-accent-10)] hover:text-white"
                    >
                      {item.label}<span className="ml-2 text-[var(--ochi-accent-light)]">↘</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="relative mt-8 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-5 sm:mt-10">
                <div>
                  <p className="text-sm font-semibold text-white">Your next favorite is out there.</p>
                  <p className="mt-1 text-xs text-slate-500">Start with what’s happening right now.</p>
                </div>
                <button type="button" onClick={() => navigate(isSignedIn ? '/upload' : '/signup')} className="shrink-0 rounded-full bg-[var(--ochi-accent)] px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-110 sm:text-sm">{isSignedIn ? 'Create a moment' : 'Join the stage'}</button>
              </div>
            </section>
          ) : null}

          {!searchLoading && !searchError && searchTerm.trim() && !searchResults.length ? (
            <section className="mb-8 rounded-[28px] border border-white/[0.08] bg-[var(--ochi-surface)] p-5 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] text-lg text-slate-200 sm:h-12 sm:w-12 sm:text-xl">⌕</div>
                <div className="min-w-0 flex-1">
                  <p className="ochi-kicker">Search the stage</p>
                  <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">No results for “{searchTerm.trim()}”</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Try a username, full name, or a broader keyword. Profiles are shown only when the creator is already registered on Ochi Live.
                  </p>
                  {recentSearches.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {recentSearches.slice(0, 4).map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setSearchTerm(term)}
                          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

        {searchLoading ? (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-4 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-[var(--ochi-accent)]" />
            Finding creators…
          </div>
        ) : null}

        {searchResults.length ? (
          <section className="mb-8 rounded-[28px] border border-white/[0.08] bg-[var(--ochi-surface)]/75 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Creator results</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{searchResults.length} matches</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {searchResults.map((profile, index) => {
                const isMutual = Boolean(profile.relationship?.isMutual || profile.isMutual);
                const isFollowedBy = Boolean(profile.relationship?.isFollowedBy || profile.isFollowedBy);
                const isFollowing = Boolean(profile.relationship?.isFollowing || profile.isFollowing);

                return (
                  <article key={profile.username} className={`rounded-2xl border bg-white/[0.025] p-4 transition hover:border-white/[0.13] ${index === selectedResultIndex ? 'border-[var(--ochi-accent-30)]' : 'border-white/[0.07]'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-100">
                        {profile.profilePictureUrl ? <img src={profile.profilePictureUrl} alt={profile.name || profile.username} className="h-full w-full object-cover" /> : (profile.name?.charAt(0)?.toUpperCase() || profile.username?.charAt(0)?.toUpperCase() || '@')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-semibold text-white">{profile.name}</p>
                          {isMutual ? <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-violet-200">Mutual</span> : null}
                        </div>
                        <p className="truncate text-sm text-slate-400">@{profile.username}</p>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">{profile.bio || 'Creator on Ochi Live.'}</p>

                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                      <span>{(profile.stats?.followers || 0).toLocaleString()} followers</span>
                      <span>{(profile.stats?.following || 0).toLocaleString()} following</span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" onClick={() => navigate(`/profile/${profile.username}`)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500">
                        View profile
                      </button>
                      <button type="button" onClick={() => handleFollowToggle(profile)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isMutual || isFollowing ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-ochi-accent/60' : 'border-ochi-accent bg-ochi-accent text-white hover:bg-ochi-accent/90'}`}>
                        {isMutual ? 'Following' : isFollowedBy ? 'Follow back' : isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

          {!isSignedIn ? (
            <section className="rounded-[28px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_100%_0%,rgba(255,255,255,0.06),transparent_52%),linear-gradient(145deg,#17191f,#111318)] p-5 sm:p-7">
              <p className="ochi-kicker">A seat is waiting</p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">Come in and find your people.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Sign in to browse live rooms, follow creators, and get recommendations shaped around what you love.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate('/login')} className="rounded-full bg-[var(--ochi-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">Sign in</button>
                <button type="button" onClick={() => navigate('/signup')} className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">Create an account</button>
              </div>
            </section>
          ) : !searchTerm.trim() ? (
            <>
              {recentSearches.length ? (
                <section className="mb-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Your recent searches</p>
                    <button type="button" onClick={clearRecentSearches} className="text-xs text-slate-500 transition hover:text-white">Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button key={term} type="button" onClick={() => setSearchTerm(term)} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-[var(--ochi-accent-30)] hover:text-white">{term}</button>
                    ))}
                  </div>
                </section>
              ) : null}
              <div id="discover-live" className="scroll-mt-24"><LiveSection /></div>
              <div id="discover-shows" className="scroll-mt-24"><UpcomingShowsSection /></div>
              <div id="discover-clips" className="scroll-mt-24"><PopularClipsSection /></div>
              <div id="discover-creators" className="scroll-mt-24 space-y-8">
                <RecommendedSection />
                <FreshOnTheMicSection />
              </div>
            </>
          ) : null}
        </div>
      </DashboardShell>
  );
}

export default DiscoverPage;
