import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getRooms } from '../api/dashboardApi';

const remainingLabel = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
};

export default function RoomsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getRooms().then(setData).catch((requestError) => setError(requestError?.response?.data?.message || 'Unable to load Ochi Rooms.'));
  }, []);

  const rooms = data?.rooms || [
    { key: 'dark-humor', label: 'Dark Humor', active: true, avatar: '/room-assets/dark-humor.jpeg' },
    { key: 'jokes', label: 'Jokes', active: true, avatar: '/room-assets/jokes.jpeg' },
    { key: 'open-mic', label: 'Open Mic', active: false },
    { key: 'story-battle', label: 'Story Battle', active: false },
  ];

  return (
    <DashboardShell title="Rooms" subtitle="Weekly challenges, ranked posts, and community conversations" showSearch={false}>
      <div className="mx-auto w-full max-w-[1180px]">
        {error ? <p role="alert" className="mb-4 rounded-2xl border border-[var(--ochi-accent-30)] bg-[var(--ochi-accent-10)] px-4 py-3 text-sm text-[var(--ochi-accent-light)]">{error}</p> : null}

        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black px-5 py-5 sm:px-7 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ochi-accent-light)]">Ochi contests</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">Compete for likes and win $7</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">The funniest post in each room wins at the end of the weekly Sunday-to-Sunday round.</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/10 bg-[var(--ochi-surface-raised)] px-4 py-3 text-right">
              <p className="text-xl font-black text-[var(--ochi-accent)]">{remainingLabel(data?.contest?.remainingSeconds || 604800)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">left · UTC</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
            {(data?.top?.length ? data.top : rooms.slice(0, 2).map((room, index) => ({ id: room.key, creatorProfilePictureUrl: room.avatar, likes: 0, creatorName: room.label, roomKey: room.key, index }))).slice(0, 20).map((post, index) => (
              <button
                key={post.id || post.roomKey}
                type="button"
                onClick={() => post.roomKey && navigate(`/rooms/${post.roomKey}`)}
                className="shrink-0 text-center"
                aria-label={`Top ${index + 1} room post`}
              >
                <span className="mx-auto block h-16 w-16 rounded-full border-2 border-[var(--ochi-accent)] p-1 sm:h-20 sm:w-20">
                  {post.creatorProfilePictureUrl ? <img src={post.creatorProfilePictureUrl} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--ochi-accent-15)] text-lg font-black text-[var(--ochi-accent-light)]">{index + 1}</span>}
                </span>
                <span className="mt-2 block max-w-20 truncate text-[10px] font-bold text-slate-300">{post.creatorName || 'Top post'}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Ochi Rooms">
          {rooms.map((room) => (
            <button
              key={room.key}
              type="button"
              disabled={!room.active}
              onClick={() => room.active && navigate(`/rooms/${room.key}`)}
              className={`relative min-h-44 overflow-hidden rounded-[24px] border p-5 text-left transition sm:min-h-52 ${
                room.active
                  ? 'border-white/[0.09] bg-[var(--ochi-surface-raised)] hover:border-[var(--ochi-accent-40)] hover:bg-[var(--ochi-accent-10)]'
                  : 'cursor-not-allowed border-white/[0.05] bg-white/[0.025] opacity-60'
              }`}
            >
              {!room.active ? <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Coming soon</span> : null}
              {room.avatar ? <img src={room.avatar} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10 sm:h-20 sm:w-20" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-white/10 text-2xl text-slate-600 sm:h-20 sm:w-20">•••</span>}
              <h2 className="mt-5 text-xl font-black tracking-tight text-white sm:text-2xl">{room.label}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">{room.active ? (room.key === 'jokes' ? 'Text and photos only' : 'Text, photos, and videos') : 'A new challenge is coming soon'}</p>
            </button>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}
