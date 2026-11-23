import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getRooms } from '../api/dashboardApi';
import { getStoredSession } from '../utils/session';

const remainingLabel = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
};

export default function RoomsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [contestRemaining, setContestRemaining] = useState(null);
  const [error, setError] = useState('');
  const [viewedTopIds, setViewedTopIds] = useState([]);
  const [adAfterTopIds, setAdAfterTopIds] = useState([]);
  const topAdStorageKey = `ochi-rooms-top-ad-state:${getStoredSession().user?.id || getStoredSession().user?.username || 'guest'}`;

  useEffect(() => {
    getRooms().then(setData).catch((requestError) => setError(requestError?.response?.data?.message || 'Unable to load Ochi Rooms.'));
  }, []);

  useEffect(() => {
    if (!data?.contest?.endAt) return undefined;
    const updateRemaining = () => Math.max(0, Math.floor((new Date(data.contest.endAt).getTime() - Date.now()) / 1000));
    setContestRemaining(updateRemaining());
    const timer = window.setInterval(() => {
      const remaining = updateRemaining();
      setContestRemaining(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        getRooms()
          .then(setData)
          .catch((requestError) => setError(requestError?.response?.data?.message || 'Unable to refresh the completed contest.'));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data?.contest?.endAt]);

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem(topAdStorageKey) || '{}');
      setViewedTopIds(Array.isArray(state.viewedIds) ? state.viewedIds.map(String) : []);
      setAdAfterTopIds(Array.isArray(state.adAfterIds) ? state.adAfterIds.map(String) : []);
    } catch {
      setViewedTopIds([]);
      setAdAfterTopIds([]);
    }
  }, [topAdStorageKey]);

  const openTopPost = (post) => {
    const id = String(post.id || post.roomKey || '');
    if (!viewedTopIds.includes(id)) {
      const nextViewedIds = [...viewedTopIds, id];
      const nextAdAfterIds = nextViewedIds.length % 3 === 0 ? [...adAfterTopIds, id] : adAfterTopIds;
      try {
        localStorage.setItem(topAdStorageKey, JSON.stringify({ viewedIds: nextViewedIds, adAfterIds: nextAdAfterIds }));
      } catch {
        setError('Top-post ad frequency cannot be saved on this device. Ads may repeat after a reload.');
      }
      setViewedTopIds(nextViewedIds);
      setAdAfterTopIds(nextAdAfterIds);
    }
    if (post.roomKey) navigate(`/rooms/${post.roomKey}`);
  };

  const rooms = data?.rooms || [
    { key: 'dark-humor', label: 'Dark Humor', active: true, avatar: '/room-assets/dark-humor.jpeg' },
    { key: 'jokes', label: 'Jokes', active: true, avatar: '/room-assets/jokes.jpeg' },
    { key: 'open-mic', label: 'Open Mic', active: false },
    { key: 'story-battle', label: 'Story Battle', active: false },
  ];
  const topItems = (data?.top?.length ? data.top : rooms.slice(0, 2).map((room, index) => ({ id: room.key, creatorProfilePictureUrl: room.avatar, likes: 0, creatorName: room.label, roomKey: room.key, index }))).slice(0, 20);
  const roomAds = data?.ads || [];

  return (
    <DashboardShell title="Rooms" subtitle="Weekly challenges, ranked posts, and community conversations" showSearch={false}>
      <div className="mx-auto w-full max-w-[1180px]">
        {error ? <p role="alert" className="mb-4 rounded-2xl border border-[var(--ochi-accent-30)] bg-[var(--ochi-accent-10)] px-4 py-3 text-sm text-[var(--ochi-accent-light)]">{error}</p> : null}

        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black px-5 py-5 sm:px-7 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ochi-accent-light)]">Ochi contests</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">Compete for likes and win $7</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">The most-liked post across both rooms wins the weekly Sunday-to-Sunday $7 prize. Previous rounds and posts stay available.</p>
              <a href="#rooms" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-slate-200">
                Explore challenges
              </a>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/10 bg-[var(--ochi-surface-raised)] px-4 py-3 text-right">
              <p className="text-xl font-black text-[var(--ochi-accent)]">{contestRemaining === null ? '—' : remainingLabel(contestRemaining)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">left · UTC</p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Top 20 this week</h2>
            <p className="mt-1 text-xs text-slate-500">Tap a creator to open their challenge post.</p>
          </div>
          <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1">
            {topItems.map((post, index) => {
              const ad = roomAds.length && adAfterTopIds.includes(String(post.id || post.roomKey))
                ? roomAds[Math.max(0, adAfterTopIds.indexOf(String(post.id || post.roomKey))) % roomAds.length]
                : null;
              return (
                <div key={post.id || post.roomKey} className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openTopPost(post)}
                    className="w-20 shrink-0 text-center sm:w-24"
                    aria-label={`Top ${index + 1} room post`}
                  >
                    <span className="mx-auto block h-16 w-16 rounded-full border-2 border-[var(--ochi-accent)] p-1 sm:h-20 sm:w-20">
                      {post.creatorProfilePictureUrl ? <img src={post.creatorProfilePictureUrl} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--ochi-accent-15)] text-lg font-black text-[var(--ochi-accent-light)]">{index + 1}</span>}
                    </span>
                    <span className="mt-2 block truncate text-[10px] font-bold text-slate-300">{post.creatorName || 'Top post'}</span>
                    <span className="block text-[9px] text-slate-500">{post.likes || 0} likes</span>
                  </button>
                  {ad ? (
                    <div aria-label={`Sponsored: ${ad.name}`} className="flex w-52 items-center gap-2 rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface-raised)] p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-[#11130b]" style={{ backgroundColor: ad.accent || '#c5e84c' }}>{ad.logoText || 'A'}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold text-white">{ad.name}</span><span className="mt-0.5 block line-clamp-2 text-[9px] leading-4 text-slate-400">{ad.description || ad.title}</span></span>
                      <span className="text-[9px] font-bold uppercase text-slate-500">Ad</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section id="rooms" className="mt-5 scroll-mt-24" aria-labelledby="room-choices-title">
          <div className="mb-3">
            <h2 id="room-choices-title" className="text-lg font-bold text-white sm:text-xl">Choose your challenge</h2>
            <p className="mt-1 text-sm text-slate-400">Pick a room, share your entry, and invite the community to vote with likes.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rooms.map((room) => (
              <button
                key={room.key}
                type="button"
                disabled={!room.active}
                onClick={() => room.active && navigate(`/rooms/${room.key}`)}
                aria-label={room.active ? `Open ${room.label} challenge` : `${room.label}, coming soon`}
                className={`group relative min-h-48 overflow-hidden rounded-[24px] border p-5 text-left transition sm:min-h-52 ${
                  room.active
                    ? 'border-white/[0.12] bg-[var(--ochi-surface-raised)] hover:border-white/25 hover:bg-[#252527]'
                    : 'cursor-not-allowed border-white/[0.05] bg-white/[0.025] opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {room.avatar
                    ? <img src={room.avatar} alt="" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/10 sm:h-16 sm:w-16" />
                    : <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-white/10 text-xl text-slate-600 sm:h-16 sm:w-16">•••</span>}
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${room.active ? 'border-white/15 bg-white/[0.06] text-slate-300' : 'border-white/10 bg-black/50 text-slate-400'}`}>
                    {room.active ? 'Open now' : 'Coming soon'}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-black tracking-tight text-white sm:text-2xl">{room.label}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">{room.active ? (room.key === 'jokes' ? 'Post jokes with text or photos. Videos are not allowed.' : 'Post dark humor with text, photos, or videos.') : 'A new challenge is on the way.'}</p>
                {room.active ? <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">Enter challenge <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span> : null}
              </button>
            ))}
          </div>
        </section>

        {data?.history?.length ? (
          <section aria-label="Previous weekly winners" className="mt-5 rounded-[24px] border border-white/[0.08] bg-[var(--ochi-surface)] p-5">
            <h2 className="text-sm font-black text-white">Previous weekly winners</h2>
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {data.history.map((round) => (
                <li key={round.id || round.startAt} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                  <span className="text-slate-400">{new Date(round.startAt).toLocaleDateString()} – {new Date(round.endAt).toLocaleDateString()}</span>
                  {round.winner ? <span className="font-bold text-white">{round.winner.name} · {round.winner.likes} likes · ${round.prizeAmount} {round.prizeCurrency} ({round.payoutStatus === 'paid' ? 'paid' : round.payoutStatus === 'processing' ? 'transfer processing' : round.payoutStatus === 'failed' ? 'manual payout required' : 'payout pending'})</span> : <span className="text-slate-500">No eligible posts</span>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      </div>
    </DashboardShell>
  );
}
