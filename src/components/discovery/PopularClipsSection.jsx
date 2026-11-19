import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVideoFeed } from '../../api/dashboardApi';

export default function PopularClipsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);
    getVideoFeed()
      .then((data) => mounted && setItems((Array.isArray(data) ? data : []).slice(0, 6)))
      .catch(() => {
        if (mounted) {
          setItems([]);
          setError(true);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => (mounted = false);
  }, [refreshKey]);

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ochi-accent)]">Made for you</p>
          <h3 className="text-xl font-semibold tracking-tight text-white">Popular clips</h3>
        </div>
        {items.length > 0 && !error ? (
          <button type="button" onClick={() => navigate('/discover/more-popular-clips')} className="text-sm font-medium text-slate-400 transition hover:text-white">
            See all
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="aspect-[3/4] w-[62%] shrink-0 animate-pulse rounded-2xl bg-[var(--ochi-surface)] sm:w-[calc(33.333%-0.5rem)]" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] px-4 py-5">
          <p className="text-sm font-medium text-slate-200">Clips couldn’t load.</p>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="mt-2 text-sm font-medium text-[var(--ochi-accent)] transition hover:text-white">
            Try again
          </button>
        </div>
      ) : items.length ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
          {items.map((item) => {
            const thumbnail = item.thumbnailUrl || item.thumbnail || item.poster;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate('/discover/more-popular-clips')}
                className="group relative aspect-[3/4] w-[62%] shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] text-left sm:w-[calc(33.333%-0.5rem)]"
              >
                {thumbnail ? <img src={thumbnail} alt={item.title || 'Popular clip'} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="block truncate text-sm font-semibold text-white">{item.title || 'Untitled clip'}</span>
                  <span className="mt-1 block truncate text-xs text-white/70">{item.creatorName || 'Ochi creator'}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] px-4 py-5">
          <p className="text-sm font-medium text-slate-200">No clips to show just yet.</p>
          <p className="mt-1 text-xs text-slate-500">New creator posts will appear here.</p>
        </div>
      )}
    </section>
  );
}
