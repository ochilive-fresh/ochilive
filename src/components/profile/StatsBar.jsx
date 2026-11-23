function StatsBar({ stats, onSelect }) {
  const items = [
    { label: 'Posts', value: stats.posts?.toLocaleString() || '0', key: 'posts' },
    { label: 'Followers', value: stats.followers?.toLocaleString() || '0', key: 'followers' },
    { label: 'Following', value: stats.following?.toLocaleString() || '0', key: 'following' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-2">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect?.(item.key)}
          className="inline-flex min-h-8 items-baseline gap-1.5 text-left transition-colors hover:text-[var(--ochi-accent-light)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ochi-accent-40)]"
        >
          <span className="text-sm font-semibold tabular-nums text-white">{item.value}</span>
          <span className="text-xs font-medium text-slate-400">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

export default StatsBar;