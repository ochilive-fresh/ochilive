function StatsBar({ stats, onSelect }) {
  const items = [
    { label: 'Followers', value: stats.followers?.toLocaleString() || '0', key: 'followers' },
    { label: 'Following', value: stats.following?.toLocaleString() || '0', key: 'following' },
    { label: 'Posts', value: stats.posts?.toLocaleString() || '0', key: 'posts' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map((item, index) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect?.(item.key)}
          className={`rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3 py-3.5 text-left transition hover:border-white/[0.14] hover:bg-white/[0.045] active:scale-[0.99] sm:px-5 sm:py-5 ${index > 0 ? 'sm:px-5' : ''}`}
        >
          <p className="text-lg font-semibold text-white sm:text-xl">{item.value}</p>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">{item.label}</p>
        </button>
      ))}
    </div>
  );
}

export default StatsBar;