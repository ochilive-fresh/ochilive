import FollowButton from './FollowButton';
import ProfileEditor from './ProfileEditor';
import StatsBar from './StatsBar';

function ProfileHeader({ user, stats, relationship, onFollowChange, onShare, onTryComedy, onMessage, onGoLive, onStatSelect, onProfileSaved, canMessage, messageLabel, isAuthenticated, onRequireAuth }) {
  const name = user?.name || 'Ochi Creator';
  const username = user?.username || 'creator';
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const accountLabel = user?.accountType === 'comedian'
    ? `Level ${user.comedyProfile?.level || 1} · ${user.comedyProfile?.levelName || 'Rookie'}`
    : user?.tier || 'Creator';

  return (
    <header className="border-b border-white/[0.08] pb-4 sm:pb-5">
      <div className="flex items-start justify-between gap-4 sm:gap-8">
        <div className="min-w-0 flex-1 pt-1">
          <p className="text-xs font-medium text-slate-400">{accountLabel}</p>
          <h2 className="mt-1 break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">{name}</h2>
          <p className="mt-0.5 text-sm font-medium text-slate-400">@{username}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{user?.bio || 'Live creator on Ochi Live.'}</p>
          {stats ? <StatsBar stats={stats} onSelect={onStatSelect} /> : null}
        </div>
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[var(--ochi-surface-raised)] text-xl font-bold tracking-wide text-white sm:h-28 sm:w-28 sm:text-2xl">
          {user?.profilePictureUrl ? <img src={user.profilePictureUrl} alt={`${name} profile`} className="h-full w-full object-cover" /> : <span>{initials}</span>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {relationship?.isOwnProfile ? (
          <div className="w-full sm:w-auto sm:min-w-64">
            <ProfileEditor profile={user} onSaved={onProfileSaved} />
          </div>
        ) : (
          <>
            <FollowButton username={username} relationship={{ ...relationship, accountType: user?.accountType }} onChange={onFollowChange} onTryComedy={onTryComedy} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />
            <button
              type="button"
              onClick={onMessage}
              className={`min-h-10 rounded-xl border px-4 py-2 text-sm font-semibold transition ${canMessage ? 'border-white/[0.16] bg-[var(--ochi-surface)] text-white hover:bg-[var(--ochi-surface-raised)]' : 'border-white/10 bg-transparent text-slate-200 hover:bg-white/[0.06]'}`}
            >
              {messageLabel || 'Message'}
            </button>
          </>
        )}
        {relationship?.isOwnProfile ? (
          <FollowButton username={username} relationship={{ ...relationship, accountType: user?.accountType }} onTryComedy={onTryComedy} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />
        ) : null}
        {relationship?.isOwnProfile && user?.accountType === 'comedian' ? (
          <button
            type="button"
            onClick={onGoLive}
            className="min-h-10 rounded-xl border border-white/[0.12] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
          >
            Go live
          </button>
        ) : null}
        <button type="button" onClick={onShare} className="min-h-10 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">Share</button>
      </div>
    </header>
  );
}

export default ProfileHeader;