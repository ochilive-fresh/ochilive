import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDiscoverItems } from '../../api/dashboardApi';

export default function FreshOnTheMicSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    getDiscoverItems()
      .then((data) => mounted && setItems((Array.isArray(data) ? data : []).filter((item) => item.type === 'creator').slice(0, 8)))
      .catch(() => mounted && setError(true))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ochi-accent-light)]">New voices, no velvet rope</p>
          <h3 className="text-xl font-semibold tracking-tight text-white">Fresh on the mic</h3>
        </div>
        <button type="button" onClick={() => navigate('/discover?focus=search')} className="text-sm font-medium text-slate-400 transition hover:text-white">Find creators</button>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-[68px] w-[68px] shrink-0 animate-pulse rounded-full bg-[var(--ochi-surface)]" />)}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] px-4 py-4">
          <p className="text-sm text-slate-300">Creator picks couldn’t load.</p>
        </div>
      ) : items.length ? (
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {items.map((item) => (
            <button key={item.id || item.username} type="button" onClick={() => item.username && navigate(`/profile/${item.username}`)} className="group flex w-[76px] shrink-0 flex-col items-center gap-2 text-center">
              <span className="rounded-full bg-gradient-to-br from-[var(--ochi-accent)] via-amber-300 to-[var(--ochi-lime)] p-[2px] transition group-hover:scale-105">
                <span className="flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full border-[3px] border-[var(--ochi-bg)] bg-[var(--ochi-surface-raised)] text-lg font-semibold text-slate-200">
                  {item.avatar || item.poster ? <img src={item.avatar || item.poster} alt="" loading="lazy" className="h-full w-full object-cover" /> : String(item.title || item.username || 'O').slice(0, 1).toUpperCase()}
                </span>
              </span>
              <span className="w-full truncate text-[11px] font-medium text-slate-300">{item.title || `@${item.username}`}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] px-4 py-4">
          <div>
            <p className="text-sm font-medium text-slate-200">The next standout could be you.</p>
            <p className="mt-1 text-xs text-slate-500">Meet new creators, or step onto the stage yourself.</p>
          </div>
          <button type="button" onClick={() => navigate('/upload')} className="shrink-0 rounded-full bg-[var(--ochi-accent-10)] px-3 py-2 text-xs font-semibold text-[var(--ochi-accent-light)] transition hover:bg-[var(--ochi-accent-20)]">Create</button>
        </div>
      )}
    </section>
  );
}
