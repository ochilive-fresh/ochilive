import FollowButton from './FollowButton';

function ProfileHeader({ user, relationship, onFollowChange, onShare, onTryComedy, onMessage, onGoLive, canMessage, messageLabel, isAuthenticated, onRequireAuth }) {
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
    <header className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[var(--ochi-surface)] sm:rounded-[28px]">
      <div className="relative h-20 overflow-hidden bg-[radial-gradient(ellipse_at_78%_10%,rgba(255,118,94,0.18),transparent_38%),linear-gradient(115deg,#202128,#111318_74%)] sm:h-28">
        <div className="absolute -right-8 -top-28 h-56 w-56 rounded-full border border-white/[0.06]" />
        <div className="absolute -right-1 -top-20 h-40 w-40 rounded-full border border-white/[0.06]" />
      </div>
      <div className="px-4 pb-5 pt-0 sm:px-6 sm:pb-6">
        <div className="-mt-10 flex flex-col gap-4 sm:-mt-12">
          <div className="flex items-end gap-3 sm:gap-4">
            <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--ochi-surface)] bg-[radial-gradient(ellipse_at_80%_10%,rgba(255,118,94,0.2),transparent_52%),#20232b] text-xl font-bold tracking-wide text-[var(--ochi-accent-light)] sm:h-24 sm:w-24 sm:text-2xl">
              {user?.profilePictureUrl ? <img src={user.profilePictureUrl} alt={`${name} profile`} className="h-full w-full object-cover" /> : <span>{initials}</span>}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--ochi-accent-light)]">{accountLabel}</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${statusClasses}`}>
                  {statusLabel}
                </span>
              </div>
              <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-white sm:text-3xl">{name}</h2>
              <p className="text-xs font-medium text-slate-400 sm:text-sm">@{username}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {relationship?.isOwnProfile && user?.accountType === 'comedian' ? (
              <button
                type="button"
                onClick={onGoLive}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ochi-accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ochi-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ochi-accent-light)]/60"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Go live
              </button>
            ) : null}
            {!relationship?.isOwnProfile && (
              <button
                type="button"
                onClick={onMessage}
                className={`min-h-10 rounded-xl border px-4 py-2 text-sm font-semibold transition ${canMessage ? 'border-[var(--ochi-accent-30)] bg-[var(--ochi-accent-strong)] text-white hover:bg-[var(--ochi-accent)]' : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'}`}
              >
                {messageLabel || 'Message'}
              </button>
            )}
            <FollowButton username={username} relationship={{ ...relationship, accountType: user?.accountType }} onChange={onFollowChange} onTryComedy={onTryComedy} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />
            <button type="button" onClick={onShare} className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]">Share</button>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">{user?.bio || 'Live creator on Ochi Live.'}</p>
      </div>
    </header>
  );
}

export default ProfileHeader;