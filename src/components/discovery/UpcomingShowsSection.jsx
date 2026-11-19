import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDiscoverItems } from '../../api/dashboardApi';

export default function UpcomingShowsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    getDiscoverItems()
      .then((d) => mounted && setItems((d || []).filter((i) => i.type === 'show').slice(0, 6)))
      .catch(() => mounted && setError(true))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ochi-accent-light)]">On the calendar</p>
          <h3 className="text-xl font-semibold tracking-tight text-white">Upcoming shows</h3>
        </div>
        {items.length > 0 ? <button type="button" onClick={() => navigate('/discover/more-upcoming-shows')} className="text-sm font-medium text-slate-400 transition hover:text-white">See all</button> : null}
      </div>

      {loading ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
          {[0, 1, 2].map((key) => <div key={key} className="aspect-[1.4] w-[75%] shrink-0 animate-pulse rounded-2xl bg-[var(--ochi-surface)] sm:w-[calc(33.333%-0.5rem)]" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] px-4 py-5">
          <p className="text-sm font-medium text-slate-200">Shows couldn’t load.</p>
          <button type="button" onClick={() => navigate('/discover/more-upcoming-shows')} className="mt-2 text-sm font-medium text-[var(--ochi-accent-light)]">Explore the show calendar</button>
        </div>
      ) : items.length ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
          {items.map((item) => (
            <button key={item.id || item.title} type="button" onClick={() => navigate('/discover/more-upcoming-shows')} className="group relative aspect-[1.4] w-[75%] shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] text-left sm:w-[calc(33.333%-0.5rem)]">
              {item.poster || item.thumbnail ? <img src={item.poster || item.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="h-full w-full bg-[radial-gradient(ellipse_at_80%_10%,rgba(255,118,94,0.28),transparent_38%),linear-gradient(135deg,#24232a,#111318)]" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ochi-accent-light)]">{item.category || 'Live show'} · {item.tag || 'Coming up'}</span>
                <span className="block truncate text-base font-semibold text-white">{item.title}</span>
                <span className="mt-1 block line-clamp-2 text-xs text-white/70">{item.description}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] px-4 py-5">
          <div>
            <p className="text-sm font-medium text-slate-200">The next show is being set up.</p>
            <p className="mt-1 text-xs text-slate-500">Check back soon, or find a creator who’s live now.</p>
          </div>
          <button type="button" onClick={() => document.getElementById('discover-live')?.scrollIntoView({ behavior: 'smooth' })} className="shrink-0 text-sm font-semibold text-[var(--ochi-accent-light)] transition hover:text-white">See live</button>
        </div>
      )}
    </section>
  );
}
