function TabsSection({ activeTab, onChange, isOwnProfile }) {
  const tabs = [
    { id: 'posts', label: 'Posts' },
    { id: 'reshared', label: 'Reshared' },
    { id: 'about', label: 'About' },
    ...(isOwnProfile ? [{ id: 'insights', label: 'Insights' }] : []),
  ];

  return (
    <div className="flex gap-7 border-b border-white/[0.08]" role="tablist" aria-label="Profile content">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative pb-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {tab.label}
          {activeTab === tab.id ? <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--ochi-accent)]" /> : null}
        </button>
      ))}
    </div>
  );
}

export default TabsSection;