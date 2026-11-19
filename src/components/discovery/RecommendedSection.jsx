import { useEffect, useState } from 'react';
import { getDiscoverItems } from '../../api/dashboardApi';

export default function RecommendedSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);
    getDiscoverItems()
      .then((data) => mounted && setItems(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => mounted && setError(true))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [refreshKey]);

  return (
    <section className="mb-6">
      <div className="mb-4 px-1">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ochi-accent-light)]">A few good places to start</p>
        <h3 className="text-xl font-semibold tracking-tight text-white">Room picks</h3>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((key) => <div key={key} className="h-32 animate-pulse rounded-2xl bg-[var(--ochi-surface)]" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] px-4 py-5">
          <p className="text-sm font-medium text-slate-200">Room picks couldn’t load.</p>
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="mt-2 text-sm font-medium text-[var(--ochi-accent-light)] transition hover:text-white">Try again</button>
        </div>
      ) : items.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <article key={item.id || item.title} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(ellipse_at_100%_0%,rgba(77,35,36,0.12),transparent_52%),linear-gradient(145deg,#17191f,#111318)] p-4 transition hover:-translate-y-0.5 hover:border-white/[0.15]">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ochi-accent-10)] text-sm text-[var(--ochi-accent-light)]">✦</span>
                <span className="rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">{item.tag || item.category || 'Ochi pick'}</span>
              </div>
              <h4 className="mt-5 text-sm font-semibold text-white">{item.title || 'A room worth finding'}</h4>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-400">{item.description || 'Discover a new voice and join the conversation.'}</p>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ochi-accent-light)]">{item.category || 'Featured room'}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] px-4 py-5">
          <p className="text-sm font-medium text-slate-200">Fresh room picks are on the way.</p>
          <p className="mt-1 text-xs text-slate-500">Search for a creator or explore the live stage in the meantime.</p>
        </div>
      )}
    </section>
  );
}
