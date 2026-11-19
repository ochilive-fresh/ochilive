import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getProfileSummary, getProfilePosts, getProfileReshares, rateProfile } from '../api/dashboardApi';
import ProfileHeader from '../components/profile/ProfileHeader';
import StatsBar from '../components/profile/StatsBar';
import TabsSection from '../components/profile/TabsSection';
import ContentGrid from '../components/profile/ContentGrid';
import ComedyOnboarding from '../components/profile/ComedyOnboarding';
import ComedianPerformanceCard from '../components/profile/ComedianPerformanceCard';
import SignUpPrompt from '../components/SignUpPrompt';
import { getStoredSession } from '../utils/session';

const fallbackProfile = {
  user: {
    id: 'user_demo',
    name: 'Ochi Creator',
    username: 'creator',
    bio: 'Live creator on Ochi Live.',
    tier: 'Creator Pro',
  },
  stats: {
    followers: 0,
    following: 0,
  },
};

const getSessionProfile = () => {
  try {
    const sessionUser = JSON.parse(sessionStorage.getItem('ochi_user') || 'null');
    if (!sessionUser) return fallbackProfile;

    return {
      ...fallbackProfile,
      user: {
        ...fallbackProfile.user,
        ...sessionUser,
        username: sessionUser.username || sessionUser.email?.split('@')[0] || fallbackProfile.user.username,
      },
      relationship: { isOwnProfile: true, isFollowing: false, accountType: sessionUser.accountType || 'creator' },
    };
  } catch {
    return fallbackProfile;
  }
};

function ProfilePage() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = Boolean(getStoredSession().token);
  const [profile, setProfile] = useState(() => {
    const currentProfile = getSessionProfile();
    return routeUsername
      ? { ...currentProfile, user: { ...currentProfile.user, username: routeUsername } }
      : currentProfile;
  });
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState({ posts: [], reshared: [] });
  const [contentLoading, setContentLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [contentError, setContentError] = useState('');
  const [contentRequestKey, setContentRequestKey] = useState(0);
  const [activeTab, setActiveTab] = useState('posts');
  const [showComedyOnboarding, setShowComedyOnboarding] = useState(false);
  const [showPerformanceProfile, setShowPerformanceProfile] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  const [signupPromptAction, setSignupPromptAction] = useState('');

  const canMessage = !profile.relationship?.isOwnProfile && Boolean(profile.user?.id);
  const messageLabel = !isAuthenticated ? 'Sign up to message' : profile.relationship?.isFollowing || profile.relationship?.isFollowedBy ? 'Message' : 'Request to message';

  const requireAccount = (action) => setSignupPromptAction(action);
  const closeSignupPrompt = () => setSignupPromptAction('');
  const openSignup = () => navigate('/signup', { state: { from: location } });
  const openLogin = () => navigate('/login', { state: { from: location } });

  useEffect(() => {
    const sessionUser = (() => {
      try {
        return JSON.parse(sessionStorage.getItem('ochi_user') || 'null');
      } catch {
        return null;
      }
    })();

    const rawSessionUsername = sessionUser?.username || sessionUser?.email?.split('@')[0] || '';
    const normalizedRouteUsername = String(routeUsername || '').trim();
    const isOwnProfile = !normalizedRouteUsername || normalizedRouteUsername.toLowerCase() === String(rawSessionUsername || '').toLowerCase();
    const targetUsername = normalizedRouteUsername || rawSessionUsername || 'creator';

    getProfileSummary(targetUsername)
      .then((data) => {
        const normalized = data && typeof data === 'object' ? data : {};
        const normalizedUser = {
          ...fallbackProfile.user,
          ...(sessionUser || {}),
          ...normalized.user,
          username: normalized.user?.username || targetUsername,
        };
        setProfileError('');
        setProfile({
          ...fallbackProfile,
          ...normalized,
          user: normalizedUser,
          stats: { ...fallbackProfile.stats, ...normalized.stats },
          relationship: {
            isOwnProfile,
            isFollowing: Boolean(normalized.relationship?.isFollowing),
            accountType: sessionUser?.accountType || normalized.user?.accountType || normalizedUser.accountType || 'creator',
          },
        });
      })
      .catch((error) => {
        const fallbackUser = getSessionProfile().user;
        const fallbackOwnerState = !normalizedRouteUsername || normalizedRouteUsername.toLowerCase() === String((sessionUser?.username || sessionUser?.email?.split('@')[0] || '')).toLowerCase();
        setProfile({
          ...fallbackProfile,
          user: { ...fallbackUser, username: targetUsername },
          stats: { ...fallbackProfile.stats, followers: 0, following: 0, posts: 0 },
          relationship: { isOwnProfile: fallbackOwnerState, isFollowing: false, accountType: fallbackUser.accountType || 'creator' },
        });
        setProfileError(error?.response?.status === 404
          ? `@${targetUsername} could not be found.`
          : `We could not load @${targetUsername}'s profile. Please try again.`);
      })
      .finally(() => setLoading(false));
  }, [routeUsername]);

  useEffect(() => {
    const username = profile.user?.username;
    if (!username) return;
    setContentLoading(true);
    setContentError('');
    const request = activeTab === 'posts' ? getProfilePosts(username) : getProfileReshares(username);
    request.then((items) => {
      setContent((current) => ({ ...current, [activeTab]: items }));
      if (activeTab === 'posts') setProfile((current) => ({ ...current, stats: { ...current.stats, posts: items.length } }));
    }).catch(() => { setContentError('We could not load this content.'); setContent((current) => ({ ...current, [activeTab]: [] })); }).finally(() => setContentLoading(false));
  }, [activeTab, profile.user?.username, contentRequestKey]);

  const handleFollowChange = (result) => {
    setProfile((current) => ({
      ...current,
      stats: { ...current.stats, ...result?.stats },
      relationship: { ...current.relationship, ...result?.relationship },
      user: { ...current.user, ...result?.user },
    }));
  };

  const handleComedyComplete = (result) => {
    setProfile((current) => ({ ...current, ...result, user: { ...current.user, ...result.user, accountType: 'comedian' }, relationship: { ...current.relationship, ...result.relationship } }));
    if (result.user) sessionStorage.setItem('ochi_user', JSON.stringify(result.user));
    setShowComedyOnboarding(false);
  };

  const handleMessage = () => {
    if (!isAuthenticated) {
      requireAccount('message creators');
      return;
    }
    if (!profile.user?.id && !profile.user?.username) return;
    const target = profile.user.id || profile.user.username;
    navigate(`/messages?user=${encodeURIComponent(target)}&username=${encodeURIComponent(profile.user.username || '')}`);
  };

  const handleRate = async (score) => {
    if (!isAuthenticated) {
      requireAccount('rate creators');
      return;
    }
    try {
      const result = await rateProfile(profile.user.username, score);
      setProfile((current) => ({ ...current, user: { ...current.user, comedyProfile: { ...current.user.comedyProfile, rating: result.rating, ratingCount: result.ratingCount } } }));
      setRatingMessage('Rating saved.');
    } catch (error) {
      setRatingMessage(error?.response?.data?.message || 'Unable to save rating.');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const safeName = profile?.user?.name || 'Ochi Creator';
    const safeUsername = profile?.user?.username || 'creator';
    if (navigator.share) await navigator.share({ title: safeName, text: `View @${safeUsername} on Ochi Live`, url });
    else await navigator.clipboard?.writeText(url);
  };

  const handleStatSelect = (stat) => {
    if (stat === 'posts') {
      setActiveTab('posts');
      return;
    }

    if (stat === 'followers' || stat === 'following') {
      setActiveTab('about');
      return;
    }

    setActiveTab('posts');
  };

  return (
    <DashboardShell
      title="Profile"
      subtitle="Your presence on Ochi Live"
    >
      {loading ? (
        <div className="mx-auto w-full max-w-[1040px] space-y-5">
          <div className="h-52 animate-pulse rounded-[28px] border border-white/[0.07] bg-[var(--ochi-surface)]" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((key) => <div key={key} className="h-20 animate-pulse rounded-2xl bg-[var(--ochi-surface)]" />)}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-[var(--ochi-surface)]" />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1040px]">
          <div className="space-y-6 pb-8 pt-1">
            {profileError ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-xs leading-5 text-slate-400">
                {profileError}
              </div>
            ) : null}
            <ProfileHeader
              user={profile.user}
              relationship={profile.relationship}
              onFollowChange={handleFollowChange}
              onShare={handleShare}
              onTryComedy={() => setShowComedyOnboarding(true)}
              onGoLive={() => navigate('/upload?mode=live')}
              onMessage={handleMessage}
              canMessage={canMessage}
              messageLabel={messageLabel}
              isAuthenticated={isAuthenticated}
              onRequireAuth={requireAccount}
            />
            {profile.user?.accountType === 'comedian' ? (
              <>
                <ComedianPerformanceCard
                  comedyProfile={profile.user.comedyProfile}
                  canRate={!profile.relationship?.isOwnProfile}
                  onRate={handleRate}
                  open={showPerformanceProfile}
                  onOpen={() => setShowPerformanceProfile(true)}
                  onClose={() => setShowPerformanceProfile(false)}
                />
                {ratingMessage ? <p className="mt-2 text-right text-xs text-slate-500" role="status">{ratingMessage}</p> : null}
              </>
            ) : null}
            <StatsBar stats={profile.stats} onSelect={handleStatSelect} />
            <TabsSection activeTab={activeTab} onChange={setActiveTab} />
            {activeTab === 'about' ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] p-5 sm:p-6">
                  <p className="ochi-kicker">The person behind the posts</p>
                  <p className="mt-4 text-base leading-7 text-slate-200">{profile.user.bio || 'No bio added yet.'}</p>
                  <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Handle</p>
                    <p className="mt-2 text-lg font-medium text-white">@{profile.user.username}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] p-5 sm:p-6">
                  <p className="ochi-kicker">At a glance</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
                      <span>Account type</span>
                      <span className="font-medium text-white">{profile.user.accountType || 'creator'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
                      <span>Followers</span>
                      <span className="font-medium text-white">{profile.stats.followers?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
                      <span>Following</span>
                      <span className="font-medium text-white">{profile.stats.following?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : contentLoading ? <div className="rounded-2xl border border-white/[0.07] bg-[var(--ochi-surface)] py-12 text-center text-sm text-slate-500">Loading {activeTab}...</div> : contentError ? <div className="rounded-2xl border border-white/[0.07] bg-[var(--ochi-surface)] py-12 text-center"><p className="text-sm text-[var(--ochi-accent-light)]">{contentError}</p><button type="button" onClick={() => { setContentError(''); setContentRequestKey((key) => key + 1); }} className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white">Retry</button></div> : <ContentGrid items={content[activeTab]} tab={activeTab} isOwnProfile={profile.relationship?.isOwnProfile} isAuthenticated={isAuthenticated} onRequireAuth={requireAccount} />}
          </div>
        </div>
      )}
      {showComedyOnboarding ? <ComedyOnboarding onComplete={handleComedyComplete} onClose={() => setShowComedyOnboarding(false)} /> : null}
      {signupPromptAction ? <SignUpPrompt action={signupPromptAction} onClose={closeSignupPrompt} onSignUp={openSignup} onSignIn={openLogin} /> : null}
    </DashboardShell>
  );
}

export default ProfilePage;
