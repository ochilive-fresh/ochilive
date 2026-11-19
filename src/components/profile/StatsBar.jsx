function StatsBar({ stats, onSelect }) {
  const items = [
    { label: 'Posts', value: stats.posts?.toLocaleString() || '0', key: 'posts' },
    { label: 'Followers', value: stats.followers?.toLocaleString() || '0', key: 'followers' },
    { label: 'Following', value: stats.following?.toLocaleString() || '0', key: 'following' },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.07] bg-[var(--ochi-surface)] px-1 py-3 sm:px-3">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect?.(item.key)}
          className="min-w-0 px-2 text-center transition-colors hover:text-[var(--ochi-accent-light)] focus-visible:rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ochi-accent-40)] sm:px-4"
        >
          <p className="text-lg font-semibold tabular-nums text-white sm:text-xl">{item.value}</p>
          <p className="mt-0.5 text-[9px] font-medium text-slate-500 sm:text-[10px]">{item.label}</p>
        </button>
      ))}
    </div>
  );
}

export default StatsBar;