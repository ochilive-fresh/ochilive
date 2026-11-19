import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getActivityFeed } from '../api/dashboardApi';

const getDateGroup = (value) => {
  const date = new Date(value || 0);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
};

function ActivityPage() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const filters = [
    { id: 'all', label: 'All activity' },
    { id: 'wallet', label: 'Wallet' },
    { id: 'social', label: 'Social' },
  ];

  const filteredActivity = useMemo(() => {
    if (activeFilter === 'wallet') return activity.filter((item) => item.wallet);
    if (activeFilter === 'social') return activity.filter((item) => item.notification);
    return activity;
  }, [activity, activeFilter]);
  const groupedActivity = useMemo(() => filteredActivity.reduce((groups, item) => {
    const group = getDateGroup(item.occurredAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {}), [filteredActivity]);
  const walletCount = activity.filter((item) => item.wallet).length;
  const socialCount = activity.filter((item) => item.notification).length;

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    getActivityFeed()
      .then((data) => setActivity(Array.isArray(data) ? data : []))
      .catch((error) => setLoadError(error?.response?.data?.message || 'We could not load activity. Please try again.'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <DashboardShell
      title="Activity"
      subtitle="A clear view of the moments and updates that matter."
      showSearch={false}
      showBack
      backFallback="/home"
    >
      <div className="overflow-hidden rounded-[26px] border border-white/[0.07] bg-[var(--ochi-surface)] shadow-[var(--ochi-shadow-card)]">
        {loading ? (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="h-36 animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
          </div>
        ) : (
          <div>
            <div className="border-b border-white/[0.07] bg-[radial-gradient(ellipse_at_top_right,rgba(197,232,76,0.11),transparent_48%),linear-gradient(135deg,var(--ochi-surface-raised),var(--ochi-surface))] px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--ochi-accent-light)]">Your space · Your updates</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Activity</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Keep up with the people, posts, and payments connected to your account.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:min-w-[310px]">
                  {[
                    { label: 'Updates', value: activity.length },
                    { label: 'Social', value: socialCount },
                    { label: 'Wallet', value: walletCount },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-3">
                      <p className="text-xl font-semibold tabular-nums text-white">{stat.value}</p>
                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Activity filters">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${activeFilter === filter.id ? 'border-[var(--ochi-accent-40)] bg-[var(--ochi-accent-15)] text-white' : 'border-white/[0.08] bg-black/15 text-slate-400 hover:border-white/20 hover:text-white'}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-black/[0.08] p-4 sm:p-7">
              {loadError ? (
                <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-5 text-center">
                  <p className="text-sm font-medium text-rose-100">{loadError}</p>
                  <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="mt-3 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                    Try again
                  </button>
                </div>
              ) : filteredActivity.length === 0 ? (
                <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.015] px-5 text-center">
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] text-xl text-[var(--ochi-accent-light)]">✦</div>
                    <p className="mt-4 text-base font-semibold text-white">{activeFilter === 'all' ? 'You’re all caught up' : `No ${activeFilter} updates yet`}</p>
                    <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">New interactions and account updates will find their place here.</p>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-8">
                  {['Today', 'Yesterday', 'Earlier'].filter((group) => groupedActivity[group]?.length).map((group) => (
                    <section key={group} aria-labelledby={`activity-${group.toLowerCase()}`}>
                      <h2 id={`activity-${group.toLowerCase()}`} className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{group}</h2>
                      <div className="relative space-y-2 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-white/[0.08] sm:before:left-[23px]">
                  {groupedActivity[group].map((item) => (
                    <article key={item.id} className="group relative flex gap-3 rounded-2xl border border-white/[0.055] bg-white/[0.018] px-3 py-4 transition hover:border-white/[0.12] hover:bg-white/[0.035] sm:gap-4 sm:px-4">
                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold sm:h-12 sm:w-12 ${item.wallet ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] text-[var(--ochi-accent-light)]'}`}>
                        {item.wallet ? '$' : '✦'}
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <h2 className="text-sm font-semibold leading-5 text-white sm:text-base">{item.title}</h2>
                            <p className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${item.wallet ? 'text-emerald-300' : 'text-[var(--ochi-accent-light)]'}`}>{item.category || 'Update'}</p>
                          </div>
                          <time className="shrink-0 text-[10px] font-medium text-slate-500">{item.time}</time>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
                        {item.wallet ? (
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            <span>Status: <strong className="font-medium text-slate-300">{item.wallet.status}</strong></span>
                            {item.wallet.reference ? <span className="max-w-full truncate">Ref: {item.wallet.reference}</span> : null}
                          </div>
                        ) : null}
                        {item.notification?.videoId || item.notification?.actorUsername ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.notification.videoId ? <button type="button" onClick={() => navigate(`/video/${encodeURIComponent(item.notification.videoId)}`)} className="rounded-full border border-white/[0.1] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-[var(--ochi-accent-30)] hover:bg-[var(--ochi-accent-10)] hover:text-white">View post</button> : null}
                            {item.notification.actorUsername ? <button type="button" onClick={() => navigate(`/profile/${encodeURIComponent(item.notification.actorUsername.replace(/^@/, ''))}`)} className="rounded-full border border-white/[0.1] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-[var(--ochi-accent-30)] hover:bg-[var(--ochi-accent-10)] hover:text-white">View profile</button> : null}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

export default ActivityPage;
