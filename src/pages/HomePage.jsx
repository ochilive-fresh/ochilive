import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import {
  getVideoFeed,
  incrementView,
  likeVideo,
  commentOnVideo,
  toggleSaveVideo,
  followProfile,
  unfollowProfile,
} from '../api/dashboardApi';
import { getStoredSession } from '../utils/session';
import LiveSection from '../components/discovery/LiveSection';

const placeholderImage =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=800&fit=crop&q=80';

const tabs = [
  { key: 'following', label: 'Following' },
  { key: 'for_you', label: 'For You' },
  { key: 'trending', label: 'Trending' },
  { key: 'recent_live', label: 'Recent Live' },
];

const FeedIcon = ({ type, active = false }) => {
  const common = 'h-6 w-6';
  if (type === 'like') {
    return <svg viewBox="0 0 24 24" className={common} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.4Z" /></svg>;
  }
  if (type === 'comment') {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.5a8.3 8.3 0 0 1-8.5 8 8.7 8.7 0 0 1-3.8-.9L3 20l1.4-4.5a7.6 7.6 0 0 1-1.4-4c0-4.4 3.8-8 9-8s8.5 3.6 8.5 8Z" /></svg>;
  }
  if (type === 'save') {
    return <svg viewBox="0 0 24 24" className={common} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5V21L12 17.4 6.5 21V4.5Z" /></svg>;
  }
  if (type === 'share') {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 3-7.2 18-3.9-7.9L2 9.2 21 3Z" /><path d="M21 3 9.9 13.1" /></svg>;
  }
  if (type === 'sound') {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d={active ? 'M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12' : 'm16 9 5 6m0-6-5 6'} /></svg>;
  }
  return null;
};

function HomePage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('for_you');
  const [commentSheetVideoId, setCommentSheetVideoId] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndY = useRef(null);
  const videoRefs = useRef({});
  const viewedIds = useRef(new Set());
  const viewTimers = useRef(new Map());
  const lastVideoTap = useRef(new Map());
  const tapTimers = useRef(new Map());
  const playbackPositions = useRef(new Map());
  const [mutedVideos, setMutedVideos] = useState({});
  const audioEnabledRef = useRef(true);
  const [heartBurstVideoId, setHeartBurstVideoId] = useState(null);
  const [videoProgress, setVideoProgress] = useState({});
  const [videoLoadState, setVideoLoadState] = useState({});

  const getLikedStorageKey = () => {
    const userId = getStoredSession().user?.id || getStoredSession().user?.username || 'guest';
    return `ochi-liked-videos:${userId}`;
  };

  const readLikedVideoIds = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(getLikedStorageKey()) || '[]');
      return new Set(Array.isArray(stored) ? stored.map(String) : []);
    } catch {
      return new Set();
    }
  };

  const rememberLikedVideo = (id) => {
    try {
      const likedIds = readLikedVideoIds();
      likedIds.add(String(id));
      localStorage.setItem(getLikedStorageKey(), JSON.stringify([...likedIds]));
    } catch {
      // Persistent UI state is best-effort when storage is unavailable.
    }
  };

  useEffect(() => {
    try {
      audioEnabledRef.current = localStorage.getItem('ochi-feed-audio') !== 'off';
    } catch {
      audioEnabledRef.current = true;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    getVideoFeed(activeTab)
      .then((data) => {
        const likedIds = readLikedVideoIds();
        setVideos(Array.isArray(data) ? data.map((video) => ({
          ...video,
          liked: Boolean(video.liked || likedIds.has(String(video.id))),
        })) : []);
        setError('');
      })
      .catch(() => {
        setVideos([]);
        setError('Unable to load the feed. Please refresh.');
      })
      .finally(() => setLoading(false));
  }, [activeTab, refreshKey]);

  useEffect(() => {
    if (!videos.length || typeof IntersectionObserver === 'undefined') return undefined;

    const activeViewTimers = viewTimers.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.dataset.videoId;
        const video = videoRefs.current[id];
        if (!video) return;

        if (entry.isIntersecting) {
          if (!video.getAttribute('src')) {
            const source = video.dataset.mediaSrc;
            if (source) {
              video.src = source;
              video.load();
            }
          }
          if (!viewTimers.current.has(id)) {
            const timer = window.setTimeout(() => {
              if (!viewedIds.current.has(id)) {
                viewedIds.current.add(id);
                handleIncrementView(id);
              }
            }, 1800);
            viewTimers.current.set(id, timer);
          }

          Object.values(videoRefs.current).forEach((otherVideo) => {
            if (otherVideo && otherVideo !== video && otherVideo.tagName === 'VIDEO') {
              try {
                otherVideo.pause();
              } catch {
                // ignore pause errors
              }
            }
          });

          const savedPosition = playbackPositions.current.get(id);
          if (savedPosition && Number.isFinite(savedPosition) && video.duration && savedPosition < video.duration - 0.5) {
            video.currentTime = savedPosition;
          }
          video.muted = mutedVideos[id] ?? !audioEnabledRef.current;
          video.play().catch(() => {
            if (!video.muted) {
              video.muted = true;
              setMutedVideos((current) => ({ ...current, [id]: true }));
              video.play().catch(() => undefined);
            }
          });
        } else {
          if (Number.isFinite(video.currentTime) && video.currentTime > 0) {
            playbackPositions.current.set(id, video.currentTime);
          }
          const timer = viewTimers.current.get(id);
          if (timer) {
            window.clearTimeout(timer);
            viewTimers.current.delete(id);
          }
          try {
            video.pause();
            video.removeAttribute('src');
            video.load();
          } catch {
            // ignore playback pause errors
          }
        }
      });
    }, { threshold: 0.5 });

    videos.forEach((video) => {
      const element = videoRefs.current[video.id];
      if (element?.tagName === 'VIDEO') {
        element.dataset.videoId = video.id;
        element.muted = mutedVideos[video.id] ?? !audioEnabledRef.current;
        element.playsInline = true;
        observer.observe(element);
      }
    });

    return () => {
      activeViewTimers.forEach((timer) => window.clearTimeout(timer));
      activeViewTimers.clear();
      observer.disconnect();
    };
  }, [videos, mutedVideos]);

  const setVideoState = (id, updater) => {
    setVideos((current) => current.map((video) => (video.id === id ? updater(video) : video)));
  };

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2400);
  };

  const getPreviewImage = (video) => {
    return video?.thumbnailUrl || video?.mediaUrl || placeholderImage;
  };

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
  };

  const handleSwipe = () => {
    if (
      touchStartX.current === null ||
      touchEndX.current === null ||
      touchStartY.current === null ||
      touchEndY.current === null
    ) return;
    const delta = touchStartX.current - touchEndX.current;
    const verticalDelta = Math.abs(touchStartY.current - touchEndY.current);
    if (Math.abs(delta) < 80 || Math.abs(delta) <= verticalDelta) return;

    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
    if (delta > 0 && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].key);
    }
    if (delta < 0 && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].key);
    }

    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  const handleToggleLike = async (id) => {
    const previousVideo = videos.find((video) => video.id === id);
    setVideoState(id, (video) => ({ ...video, liked: true, likes: Number(video.likes || 0) + (video.liked ? 0 : 1) }));
    try {
      const updated = await likeVideo(id);
      rememberLikedVideo(id);
      setVideoState(id, (video) => ({
        ...video,
        ...updated,
        liked: true,
        likes: Number(updated?.likes ?? Number(video.likes || 0) + 1),
      }));
      showMessage(updated?.message || 'You liked this post.');
    } catch {
      if (!previousVideo?.liked) {
        setVideoState(id, (video) => ({ ...video, liked: false, likes: Math.max(0, Number(video.likes || 0) - 1) }));
      }
      showMessage('Unable to like the post.');
    }
  };

  const handleVideoTap = (event, video) => {
    event.stopPropagation();
    if (video.type === 'live') {
      navigate(`/live/${video.id}`);
      return;
    }

    const now = Date.now();
    const previousTap = lastVideoTap.current.get(video.id) || 0;
    lastVideoTap.current.set(video.id, now);

    if (now - previousTap < 320) {
      const pendingTap = tapTimers.current.get(video.id);
      if (pendingTap) {
        window.clearTimeout(pendingTap);
        tapTimers.current.delete(video.id);
      }
      handleToggleLike(video.id);
      setHeartBurstVideoId(video.id);
      window.setTimeout(() => setHeartBurstVideoId((current) => (current === video.id ? null : current)), 850);
      return;
    }

    const pendingTap = window.setTimeout(() => {
      tapTimers.current.delete(video.id);
      const element = videoRefs.current[video.id];
      if (!element) return;
      if (element.paused) {
        element.play().catch(() => undefined);
      } else {
        element.pause();
      }
    }, 320);
    tapTimers.current.set(video.id, pendingTap);
  };

  const handlePhotoTap = (event, video) => {
    event.stopPropagation();
    const now = Date.now();
    const previousTap = lastVideoTap.current.get(video.id) || 0;
    lastVideoTap.current.set(video.id, now);
    if (now - previousTap < 320) {
      handleToggleLike(video.id);
      setHeartBurstVideoId(video.id);
      window.setTimeout(() => setHeartBurstVideoId((current) => (current === video.id ? null : current)), 850);
    }
  };

  const handleToggleSound = (event, id) => {
    event.stopPropagation();
    const element = videoRefs.current[id];
    if (!element) return;
    const nextMuted = !element.muted;
    element.muted = nextMuted;
    setMutedVideos((current) => ({ ...current, [id]: nextMuted }));
    audioEnabledRef.current = !nextMuted;
    try {
      localStorage.setItem('ochi-feed-audio', nextMuted ? 'off' : 'on');
    } catch {
      // Remembering audio preference is optional.
    }
    if (!nextMuted) element.play().catch(() => undefined);
  };

  const handleToggleSave = async (id) => {
    try {
      const response = await toggleSaveVideo(id);
      setVideoState(id, (video) => ({ ...video, saved: response.saved }));
      showMessage(response.saved ? 'Saved to your library.' : 'Removed from saved posts.');
    } catch {
      showMessage('Unable to save this post.');
    }
  };

  const handleToggleFollow = async (video) => {
    if (!video.creatorUsername) return;
    try {
      const result = video.isFollowing
        ? await unfollowProfile(video.creatorUsername)
        : await followProfile(video.creatorUsername);
      const nextFollowState = Boolean(result?.relationship?.isFollowing ?? !video.isFollowing);
      setVideoState(video.id, (current) => ({
        ...current,
        isFollowing: nextFollowState,
      }));
      showMessage(nextFollowState ? 'Now following creator.' : 'Unfollowed creator.');
    } catch {
      showMessage('Unable to update follow state right now.');
    }
  };

  const handleOpenComments = (video) => {
    setCommentSheetVideoId(video.id);
    setCommentDraft('');
    setReplyTarget(null);
  };

  const handleSubmitComment = async () => {
    if (!commentSheetVideoId) return;

    const trimmed = String(commentDraft || '').trim();
    if (!trimmed) return;

    const finalComment = replyTarget ? `@${replyTarget.userName} ${trimmed}` : trimmed;

    try {
      const response = await commentOnVideo(commentSheetVideoId, finalComment);
      setVideoState(commentSheetVideoId, (video) => ({
        ...video,
        ...response.video,
        commentThread: Array.isArray(response.video.commentThread) ? response.video.commentThread : video.commentThread,
      }));
      setCommentDraft('');
      setReplyTarget(null);
      showMessage(replyTarget ? 'Reply sent.' : 'Comment added.');
    } catch {
      showMessage('Unable to post comment.');
    }
  };

  const activeCommentVideo = videos.find((video) => video.id === commentSheetVideoId) || null;
  const activeCommentThread = Array.isArray(activeCommentVideo?.commentThread) ? activeCommentVideo.commentThread : [];

  const handleShare = async (video) => {
    const shareText = `${video.title} by ${video.creatorName}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, text: shareText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        showMessage('Post details copied to clipboard.');
      } else {
        showMessage('Share is not available in this browser.');
      }
    } catch {
      showMessage('Unable to complete sharing.');
    }
  };

  const isVideoType = (video) => String(video?.type || '').toLowerCase() === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(video?.mediaUrl || video?.thumbnailUrl || ''));

  const handleIncrementView = async (id) => {
    try {
      const updated = await incrementView(id);
      setVideoState(id, (video) => ({ ...video, ...updated }));
    } catch {
      showMessage('Unable to update view count.');
    }
  };

  return (
    <DashboardShell
      title="Your stage"
      subtitle="The latest from creators and live comedy."
    >
      <style>{`
        @keyframes feed-heart-burst {
          0% { opacity: 0; transform: scale(.35) rotate(-10deg); }
          20% { opacity: 1; transform: scale(1.18) rotate(0deg); }
          62% { opacity: 1; transform: scale(1) rotate(0deg); }
          100% { opacity: 0; transform: scale(1.35) rotate(8deg); }
        }
        @keyframes feed-photo-drift {
          0%, 100% { transform: scale(1.02); }
          50% { transform: scale(1.08); }
        }
        .feed-heart-burst { animation: feed-heart-burst .85s cubic-bezier(.2,.8,.2,1) both; }
        .feed-photo-motion { animation: feed-photo-drift 12s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) {
          .feed-heart-burst, .feed-photo-motion { animation: none !important; }
        }
      `}</style>
      <div className="mx-auto grid w-full max-w-[1180px] gap-8 min-[1440px]:grid-cols-[minmax(0,600px)_minmax(260px,320px)] min-[1440px]:items-start">
      <section className="min-w-0">
      {message ? (
        <div role="status" className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${/^(Unable|No media|Share is not)/.test(message) ? 'border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] text-[var(--ochi-accent-light)]' : 'border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-100'}`}>
          {message}
        </div>
      ) : null}

      <div
        className="bg-transparent p-0"
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0].clientX;
          touchStartY.current = event.changedTouches[0].clientY;
        }}
        onTouchEnd={(event) => {
          touchEndX.current = event.changedTouches[0].clientX;
          touchEndY.current = event.changedTouches[0].clientY;
          handleSwipe();
        }}
      >
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-white/[0.025] p-1 no-scrollbar sm:rounded-2xl">
          {tabs.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleSelectTab(tab.key)}
                className={`relative shrink-0 rounded-lg px-3 py-2 text-xs font-semibold tracking-normal transition-all duration-200 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm ${
                  active
                    ? 'bg-[var(--ochi-surface-raised)] text-white shadow-sm ring-1 ring-white/[0.06]'
                    : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex min-h-72 items-center justify-center rounded-[28px] border border-white/[0.07] bg-[var(--ochi-surface)]/70">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-[var(--ochi-accent)]" />
            Finding your next favorite…
          </div>
        </div>
      ) : error ? (
        <div role="alert" className="mt-4 rounded-[28px] border border-white/[0.08] bg-[var(--ochi-surface)] p-6 text-slate-100 sm:p-8">
          <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ochi-accent-10)] text-lg text-[var(--ochi-accent-light)]">!</span>
          <p className="text-lg font-semibold text-white">The room didn’t load.</p>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="rounded-full bg-[var(--ochi-accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ochi-accent)]">Try again</button>
            {!getStoredSession().token ? <button type="button" onClick={() => navigate('/login')} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">Sign in</button> : null}
          </div>
        </div>
      ) : (
        <div className="-mx-4 mt-2 h-[calc(100dvh-244px)] min-h-[360px] overflow-y-auto overscroll-contain snap-y snap-mandatory sm:mx-0 sm:mt-4 sm:h-auto sm:max-h-[calc(100dvh-14rem)] sm:min-h-0 sm:space-y-4 sm:pr-1">
          {videos.length ? (
            videos.map((video) => (
              <article
                key={video.id}
                className="relative flex h-full min-h-0 w-full snap-start flex-col overflow-hidden bg-[#101114] sm:h-[72svh] sm:min-h-[460px] sm:max-h-[780px] sm:rounded-[30px] sm:border sm:border-white/[0.09] sm:shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
                onClick={() => {
                  if (video.type === 'live') {
                    navigate(`/live/${video.id}`);
                  } else {
                  }
                }}
                onTouchStart={(event) => {
                  touchStartX.current = event.changedTouches[0].clientX;
                  touchStartY.current = event.changedTouches[0].clientY;
                }}
                onTouchEnd={(event) => {
                  touchEndX.current = event.changedTouches[0].clientX;
                  touchEndY.current = event.changedTouches[0].clientY;
                  handleSwipe();
                }}
              >
                <div className="relative min-h-0 flex-1 overflow-hidden bg-black sm:rounded-t-[29px]">
                {isVideoType(video) ? (
                  <video
                    ref={(node) => {
                      if (node) videoRefs.current[video.id] = node;
                    }}
                    data-media-src={video.mediaUrl || video.thumbnailUrl}
                    poster={video.thumbnailUrl || video.mediaUrl}
                    muted={mutedVideos[video.id] ?? !audioEnabledRef.current}
                    autoPlay
                    loop
                    playsInline
                    preload="none"
                    className="h-full w-full object-cover"
                    onLoadStart={() => setVideoLoadState((current) => ({ ...current, [video.id]: 'loading' }))}
                    onCanPlay={() => setVideoLoadState((current) => ({ ...current, [video.id]: 'ready' }))}
                    onError={() => setVideoLoadState((current) => ({ ...current, [video.id]: 'error' }))}
                    onLoadedMetadata={(event) => {
                      const savedPosition = playbackPositions.current.get(video.id);
                      if (savedPosition && savedPosition < event.currentTarget.duration - 0.5) {
                        event.currentTarget.currentTime = savedPosition;
                      }
                    }}
                    onTimeUpdate={(event) => {
                      const { currentTime, duration } = event.currentTarget;
                      playbackPositions.current.set(video.id, currentTime);
                      if (duration) setVideoProgress((current) => ({ ...current, [video.id]: currentTime / duration }));
                    }}
                    onPointerUp={(event) => handleVideoTap(event, video)}
                  />
                ) : (
                  <img
                    src={getPreviewImage(video)}
                    alt={video.title}
                    className="feed-photo-motion h-full w-full object-cover"
                    onClick={(event) => {
                      if (video.type === 'live') navigate(`/live/${video.id}`);
                      else handlePhotoTap(event, video);
                    }}
                  />
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                {isVideoType(video) && videoLoadState[video.id] === 'loading' ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="Loading video" />
                  </div>
                ) : null}

                {isVideoType(video) && videoLoadState[video.id] === 'error' ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 px-6 text-center backdrop-blur-sm">
                    <div>
                      <p className="text-sm font-semibold text-white">Video unavailable</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const element = videoRefs.current[video.id];
                          if (!element) return;
                          setVideoLoadState((current) => ({ ...current, [video.id]: 'loading' }));
                          element.load();
                          element.play().catch(() => undefined);
                        }}
                        className="mt-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                ) : null}

                {heartBurstVideoId === video.id ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <span className="feed-heart-burst text-8xl text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.6)]" aria-hidden="true">♥</span>
                  </div>
                ) : null}

                <div className="absolute inset-x-0 top-3 z-10 flex items-center justify-between px-3 sm:top-4 sm:px-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-100 backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[10px]">
                      {video.type === 'live' ? 'LIVE' : video.category || 'Creator'}
                    </span>
                    {video.creatorUsername && getStoredSession().user?.username !== video.creatorUsername ? (
                      <button type="button" onClick={(event) => { event.stopPropagation(); handleToggleFollow(video); }} className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold text-slate-950 shadow-lg">
                        {video.isFollowing ? 'Following' : 'Follow'}
                      </button>
                    ) : null}
                  </div>
                  {isVideoType(video) ? (
                    <button
                      type="button"
                      onClick={(event) => handleToggleSound(event, video.id)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 text-white shadow-lg backdrop-blur-xl transition hover:bg-black/65"
                      aria-label={(mutedVideos[video.id] ?? !audioEnabledRef.current) ? 'Unmute video' : 'Mute video'}
                    >
                      <FeedIcon type="sound" active={!(mutedVideos[video.id] ?? !audioEnabledRef.current)} />
                      <span className="text-[11px] font-semibold">{(mutedVideos[video.id] ?? !audioEnabledRef.current) ? 'Sound off' : 'Sound on'}</span>
                    </button>
                  ) : <span className="rounded-full bg-slate-950/40 px-2.5 py-0.5 text-[9px] font-medium text-slate-200 backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[10px]">{Number(video.views || 0).toLocaleString()} views</span>}
                </div>

                {isVideoType(video) ? (
                  <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/15">
                    <div
                      className="h-full bg-white transition-[width] duration-200"
                      style={{ width: `${Math.min(100, Math.max(0, (videoProgress[video.id] || 0) * 100))}%` }}
                    />
                  </div>
                ) : null}
                </div>

                <div className="shrink-0 border-t border-white/[0.06] px-3 pb-3 pt-1.5 sm:px-5 sm:pb-4">
                  <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleLike(video.id);
                    }}
                    className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-white transition hover:bg-white/[0.05] active:scale-95"
                    aria-label={video.liked ? 'Unlike post' : 'Like post'}
                    aria-pressed={Boolean(video.liked)}
                  >
                    <span className={video.liked ? 'text-rose-400' : 'text-white'}><FeedIcon type="like" active={video.liked} /></span>
                    <span className="text-[10px] font-medium text-slate-400">{Number(video.likes || 0).toLocaleString()} likes</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenComments(video);
                    }}
                    className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-white transition hover:bg-white/[0.05] active:scale-95"
                    aria-label="Comment on post"
                  >
                    <span><FeedIcon type="comment" /></span>
                    <span className="text-[10px] font-medium text-slate-400">{Number(video.comments || 0).toLocaleString()} comments</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleSave(video.id);
                    }}
                    className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-white transition hover:bg-white/[0.05] active:scale-95"
                    aria-label={video.saved ? 'Remove from saved' : 'Save post'}
                    aria-pressed={Boolean(video.saved)}
                  >
                    <span className={video.saved ? 'text-emerald-300' : 'text-white'}><FeedIcon type="save" active={video.saved} /></span>
                    <span className="text-[10px] font-medium text-slate-400">{Number(video.saves || video.savedCount || 0).toLocaleString()} saves</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleShare(video);
                    }}
                    className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-white transition hover:bg-white/[0.05] active:scale-95"
                    aria-label="Share post"
                  >
                    <span><FeedIcon type="share" /></span>
                    <span className="text-[10px] font-medium text-slate-400">{Number(video.shares || video.shareCount || 0).toLocaleString()} shares</span>
                  </button>
                  </div>

                  <div className="mt-1 px-1">
                    <p className="text-xs font-medium text-slate-300">@{video.creatorName}</p>
                    <h2 className="mt-0.5 line-clamp-1 text-base font-semibold leading-5 text-white sm:text-lg">{video.title}</h2>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-400 sm:line-clamp-2">
                      {video.description || 'Fresh creator content for your feed.'}
                    </p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-white/[0.08] bg-[var(--ochi-surface)] p-7 text-center sm:p-10">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ochi-accent-10)] text-xl text-[var(--ochi-accent-light)]">✦</span>
              <p className="text-base font-semibold text-white">Your feed is ready for its first moment.</p>
              <p className="mt-2 text-sm text-slate-400">Discover creators or share a clip to get the conversation started.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => navigate('/discover')} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06]">Explore creators</button>
                <button type="button" onClick={() => navigate('/upload')} className="rounded-xl bg-[var(--ochi-accent-strong)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ochi-accent)]">Create a post</button>
              </div>
            </div>
          )}
        </div>
      )}
      </section>

      <aside className="hidden min-w-0 min-[1440px]:block">
        <LiveSection compact />
        <div className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_100%_0%,rgba(255,118,94,0.18),transparent_52%),linear-gradient(145deg,#17191f,#101115)] p-5">
          <p className="ochi-kicker">Your next move</p>
          <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">Make a moment of your own.</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Drop a clip for the community or start a live set when you’re ready.</p>
          <button type="button" onClick={() => navigate('/upload')} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--ochi-accent)] px-4 text-sm font-semibold text-[#1a100e] transition hover:brightness-110">
            <span className="text-lg leading-none">+</span> Create something
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-slate-200">Looking for a new voice?</p>
            <p className="mt-0.5 text-xs text-slate-500">Meet your next favorite creator.</p>
          </div>
          <button type="button" onClick={() => navigate('/discover')} className="ml-3 text-sm font-semibold text-[var(--ochi-accent-light)] transition hover:text-white" aria-label="Discover creators">↗</button>
        </div>
        <p className="px-1 pt-5 text-[10px] leading-5 text-slate-600">Ochi is a space for creators and their communities. Find a seat, stay a while.</p>
      </aside>
      </div>

      {activeCommentVideo ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 pb-0 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-t-[28px] border border-slate-700 bg-slate-950/95 shadow-[0_-25px_60px_rgba(2,6,23,0.8)]">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Comments</p>
                <h3 className="text-lg font-semibold text-white">{Number(activeCommentVideo.comments || activeCommentThread.length || 0).toLocaleString()}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCommentSheetVideoId(null);
                  setCommentDraft('');
                  setReplyTarget(null);
                }}
                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto px-4 py-4">
              {activeCommentThread.length ? (
                activeCommentThread.map((comment, index) => {
                  const author = comment.userName || 'Creator';
                  const initial = author.charAt(0).toUpperCase() || 'C';
                  const commentText = typeof comment.text === 'string' ? comment.text : '';
                  const createdAt = comment.createdAt ? new Date(comment.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Now';

                  return (
                    <div key={`${comment.userId || author}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-xs font-bold text-white">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{author}</p>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{createdAt}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyTarget({ userName: author, userId: comment.userId || author })}
                              className="text-[10px] uppercase tracking-[0.16em] text-sky-300 hover:text-sky-200"
                            >
                              Reply
                            </button>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-200">{commentText}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-5 text-center text-sm text-slate-400">
                  Be the first to comment on this post.
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 bg-slate-950/90 p-4">
              {replyTarget ? (
                <div className="mb-2 flex items-center justify-between gap-3 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200">
                  <span>Replying to @{replyTarget.userName}</span>
                  <button type="button" onClick={() => setReplyTarget(null)} className="text-sky-200 hover:text-white">
                    Cancel
                  </button>
                </div>
              ) : null}

              <div className="flex items-end gap-2">
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  rows={1}
                  placeholder={replyTarget ? `Reply to ${replyTarget.userName}...` : 'Add a comment...'}
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={!String(commentDraft || '').trim()}
                  className="rounded-2xl border border-sky-500/40 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}

export default HomePage;
