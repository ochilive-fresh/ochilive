import FollowButton from './FollowButton';

function ProfileHeader({ user, relationship, onFollowChange, onShare, onTryComedy, onMessage, onGoLive, canMessage, messageLabel }) {
  const name = user?.name || 'Ochi Creator';
  const username = user?.username || 'creator';
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const accountLabel = user?.accountType === 'comedian'
    ? `Level ${user.comedyProfile?.level || 1} · ${user.comedyProfile?.levelName || 'Rookie'}`
    : user?.tier || 'Creator';
  const statusLabel = relationship?.isMutual ? 'Mutual' : relationship?.isFollowing && relationship?.isFollowedBy ? 'Follow back' : relationship?.isFollowing ? 'Following' : relationship?.isFollowedBy ? 'Follow back' : 'Public profile';
  const statusClasses = relationship?.isMutual
    ? 'border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] text-[var(--ochi-accent-light)]'
    : relationship?.isFollowing || relationship?.isFollowedBy
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      : 'border-white/10 bg-white/[0.04] text-slate-300';

  return (
    <header className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[var(--ochi-surface)] shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:rounded-[32px]">
      <div className="relative h-28 overflow-hidden bg-[radial-gradient(ellipse_at_78%_10%,rgba(255,118,94,0.3),transparent_34%),radial-gradient(ellipse_at_12%_100%,rgba(215,245,106,0.11),transparent_38%),linear-gradient(115deg,#202128,#111318_74%)] sm:h-40">
        <div className="absolute -right-10 -top-32 h-72 w-72 rounded-full border border-white/[0.07]" />
        <div className="absolute -right-2 -top-24 h-56 w-56 rounded-full border border-white/[0.07]" />
        <span className="absolute bottom-4 right-5 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/40 sm:bottom-5 sm:right-7">A voice on Ochi</span>
      </div>
      <div className="px-4 pb-6 pt-0 sm:px-7">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3 sm:gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[5px] border-[var(--ochi-surface)] bg-[radial-gradient(ellipse_at_80%_10%,rgba(255,118,94,0.2),transparent_52%),#20232b] text-xl font-bold tracking-wide text-[var(--ochi-accent-light)] shadow-[0_18px_44px_rgba(0,0,0,0.38)] sm:h-28 sm:w-28 sm:text-3xl">
              {user?.profilePictureUrl ? <img src={user.profilePictureUrl} alt={`${name} profile`} className="h-full w-full object-cover" /> : <span>{initials}</span>}
            </div>

            <div className="min-w-0 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--ochi-accent-light)]">{accountLabel}</p>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${statusClasses}`}>
                  {statusLabel}
                </span>
              </div>
              <h2 className="mt-1 break-words text-xl font-semibold tracking-[-0.04em] text-white sm:mt-2 sm:text-4xl">{name}</h2>
              <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">@{username}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {relationship?.isOwnProfile && user?.accountType === 'comedian' ? (
              <button
                type="button"
                onClick={onGoLive}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--ochi-accent-strong)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ochi-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ochi-accent-light)]/60"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Go live
              </button>
            ) : null}
            {!relationship?.isOwnProfile && (
              <button
                type="button"
                onClick={onMessage}
                className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${canMessage ? 'border-[var(--ochi-accent-30)] bg-[var(--ochi-accent-strong)] text-white hover:bg-[var(--ochi-accent)]' : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'}`}
              >
                {messageLabel || 'Message'}
              </button>
            )}
            <FollowButton username={username} relationship={{ ...relationship, accountType: user?.accountType }} onChange={onFollowChange} onTryComedy={onTryComedy} />
            <button type="button" onClick={onShare} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">Share</button>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">{user?.bio || 'Live creator on Ochi Live.'}</p>
      </div>
    </header>
  );
}

export default ProfileHeader;