import { followProfile, unfollowProfile } from '../../api/dashboardApi';
import { useState, useEffect } from 'react';

function FollowButton({ username, relationship, onChange, onTryComedy, isAuthenticated = true, onRequireAuth }) {
  const [state, setState] = useState({
    isFollowing: Boolean(relationship?.isFollowing),
    isFollowedBy: Boolean(relationship?.isFollowedBy),
    isMutual: Boolean(relationship?.isMutual),
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setState({
      isFollowing: Boolean(relationship?.isFollowing),
      isFollowedBy: Boolean(relationship?.isFollowedBy),
      isMutual: Boolean(relationship?.isMutual),
    });
  }, [relationship?.isFollowing, relationship?.isFollowedBy, relationship?.isMutual]);

  if (relationship?.isOwnProfile) {
    if (relationship?.accountType === 'comedian') return <span className="border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-slate-200">Comedian profile</span>;
    return <button type="button" onClick={onTryComedy} className="border border-ochi-accent bg-ochi-accent px-7 py-2.5 text-sm font-semibold text-white">Try Comedy</button>;
  }

  const label = state.isMutual ? 'Following' : state.isFollowedBy ? 'Follow back' : state.isFollowing ? 'Following' : 'Follow';
  const buttonClasses = state.isMutual || state.isFollowing
    ? 'border-slate-700 bg-slate-900 text-slate-200 hover:border-ochi-accent/50'
    : state.isFollowedBy
      ? 'border-white/20 bg-white/[0.08] text-white hover:border-white/30'
      : 'border-ochi-accent bg-ochi-accent text-white hover:bg-ochi-accent/80';

  const toggle = async () => {
    if (!isAuthenticated) {
      onRequireAuth?.('follow creators');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const result = state.isFollowing ? await unfollowProfile(username) : await followProfile(username);
      const nextRelationship = result?.relationship || {};
      const nextState = {
        isFollowing: Boolean(nextRelationship.isFollowing),
        isFollowedBy: Boolean(nextRelationship.isFollowedBy),
        isMutual: Boolean(nextRelationship.isMutual),
      };
      setState(nextState);
      onChange?.(result);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to update follow state.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`border px-7 py-2.5 text-sm font-semibold transition-colors ${buttonClasses}`}
        aria-pressed={state.isFollowing || state.isMutual}
      >
        {loading ? 'Updating...' : label}
      </button>
      {errorMessage ? <p role="alert" className="mt-1 text-xs text-rose-300">{errorMessage}</p> : null}
    </div>
  );
}

export default FollowButton;