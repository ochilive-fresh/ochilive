import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import {
  getVideoById,
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
import SignUpPrompt from '../components/SignUpPrompt';

const placeholderImage =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=800&fit=crop&q=80';

const tabs = [
  { key: 'following', label: 'Following' },
  { key: 'for_you', label: 'For You' },
  { key: 'trending', label: 'Trending' },
  { key: 'recent_live', label: 'Recent Live' },
];

const formatActionCount = (value) => {
  const count = Number(value);
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number.isFinite(count) ? count : 0);
};

const getCommentId = (comment, index) => comment.commentId || comment._id?.toString?.() || `${comment.userId || comment.userName || 'comment'}-${comment.createdAt || index}`;

const buildCommentTree = (comments) => {
  const entries = Array.isArray(comments) ? comments : [];
  const byId = new Map();
  const roots = [];
  entries.forEach((comment, index) => {
    const id = getCommentId(comment, index);
    byId.set(id, { ...comment, commentId: id, replies: [] });
  });
  entries.forEach((comment, index) => {
    const entry = byId.get(getCommentId(comment, index));
    const parent = comment.parentCommentId ? byId.get(String(comment.parentCommentId)) : null;
    if (parent) parent.replies.push(entry);
    else roots.push(entry);
  });
  return roots;
};

const formatCommentTime = (value) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Just now';
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
};

const FeedIcon = ({ type, active = false }) => {
  const common = 'h-5 w-5';
  if (type === 'like') {
    return <svg viewBox="0 0 24 24" className={common} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /></svg>;
  }
  if (type === 'comment') {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.25 11.5a8.25 8.25 0 0 1-8.25 8.25 8.2 8.2 0 0 1-3.82-.94L3 20.25l1.44-4.32A8.2 8.2 0 0 1 3.75 12a8.25 8.25 0 1 1 16.5-.5Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></svg>;
  }
  if (type === 'save') {
    return <svg viewBox="0 0 24 24" className={common} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6.75 4.5A2.25 2.25 0 0 1 9 2.25h6a2.25 2.25 0 0 1 2.25 2.25v16.75L12 17.5l-5.25 3.75V4.5Z" /></svg>;
  }
  if (type === 'share') {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 15 22l-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /></svg>;
  }
  return null;
};

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { videoId } = useParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('for_you');
  const [commentSheetVideoId, setCommentSheetVideoId] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [pendingLikes, setPendingLikes] = useState(() => new Set());
  const [signupPromptAction, setSignupPromptAction] = useState('');
  const commentComposerRef = useRef(null);
  const videoRefs = useRef({});
  const viewedIds = useRef(new Set());
  const viewTimers = useRef(new Map());
  const lastVideoTap = useRef(new Map());
  const tapTimers = useRef(new Map());
  const playbackPositions = useRef(new Map());
  const [mutedVideos, setMutedVideos] = useState({});
  const [heartBurstVideoId, setHeartBurstVideoId] = useState(null);
  const [videoProgress, setVideoProgress] = useState({});
  const [videoLoadState, setVideoLoadState] = useState({});
  const [mediaAspectRatios, setMediaAspectRatios] = useState({});

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

  const rememberLikedVideo = (id, liked) => {
    try {
      const likedIds = readLikedVideoIds();
      if (liked) likedIds.add(String(id));
      else likedIds.delete(String(id));
      localStorage.setItem(getLikedStorageKey(), JSON.stringify([...likedIds]));
    } catch {
      // Persistent UI state is best-effort when storage is unavailable.
    }
  };

  useEffect(() => {
    setLoading(true);
    const request = videoId ? getVideoById(videoId).then((video) => [video]) : getVideoFeed(activeTab);
    request
      .then((data) => {
        const likedIds = readLikedVideoIds();
        setVideos(Array.isArray(data) ? data.map((video) => ({
          ...video,
          liked: typeof video.liked === 'boolean' ? video.liked : likedIds.has(String(video.id)),
        })) : []);
        setError('');
      })
      .catch((requestError) => {
        setVideos([]);
        setError(requestError?.response?.data?.message || (videoId ? 'Unable to load this post. Please try again.' : 'Unable to load the feed. Please refresh.'));
      })
      .finally(() => setLoading(false));
  }, [activeTab, refreshKey, videoId]);

  useEffect(() => {
    if (!videoId || !videos.some((video) => String(video.id) === String(videoId)) || !new URLSearchParams(location.search).has('comments')) return;
    setCommentSheetVideoId(videoId);
    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate, videoId, videos]);

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
          video.muted = mutedVideos[id] ?? false;
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
        element.muted = mutedVideos[video.id] ?? false;
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

  const requireAccount = (action) => setSignupPromptAction(action);
  const closeSignupPrompt = () => setSignupPromptAction('');
  const openSignup = () => navigate('/signup', { state: { from: location } });
  const openLogin = () => navigate('/login', { state: { from: location } });

  const getPreviewImage = (video) => {
    return video?.thumbnailUrl || video?.mediaUrl || placeholderImage;
  };

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
  };

  const handleToggleLike = async (id) => {
    if (!getStoredSession().token) {
      requireAccount('like posts');
      return;
    }
    if (pendingLikes.has(id)) return;
    const previousVideo = videos.find((video) => video.id === id);
    if (!previousVideo) return;
    const wasLiked = Boolean(previousVideo.liked);
    setPendingLikes((current) => new Set(current).add(id));
    setVideoState(id, (video) => ({
      ...video,
      liked: !wasLiked,
      likes: Math.max(0, Number(video.likes || 0) + (wasLiked ? -1 : 1)),
    }));
    try {
      const updated = await likeVideo(id);
      rememberLikedVideo(id, Boolean(updated.liked));
      setVideoState(id, (video) => ({
        ...video,
        ...updated,
        liked: Boolean(updated.liked),
        likes: Number(updated.likes ?? video.likes),
      }));
      showMessage(updated?.message || (updated.liked ? 'You liked this post.' : 'Like removed.'));
    } catch {
      setVideoState(id, (video) => ({ ...video, liked: wasLiked, likes: Number(previousVideo.likes || 0) }));
      showMessage('Unable to update the like. Please try again.');
    } finally {
      setPendingLikes((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
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
      if (!getStoredSession().token) {
        requireAccount('like posts');
        return;
      }
      if (!video.liked) handleToggleLike(video.id);
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
      if (!getStoredSession().token) {
        requireAccount('like posts');
        return;
      }
      if (!video.liked) handleToggleLike(video.id);
      setHeartBurstVideoId(video.id);
      window.setTimeout(() => setHeartBurstVideoId((current) => (current === video.id ? null : current)), 850);
    }
  };

  const handleToggleSave = async (id) => {
    if (!getStoredSession().token) {
      requireAccount('save posts');
      return;
    }
    try {
      const response = await toggleSaveVideo(id);
      setVideoState(id, (video) => ({ ...video, saved: response.saved }));
      showMessage(response.saved ? 'Saved to your library.' : 'Removed from saved posts.');
    } catch {
      showMessage('Unable to save this post.');
    }
  };

  const handleToggleFollow = async (video) => {
    if (!getStoredSession().token) {
      requireAccount('follow creators');
      return;
    }
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
    setCommentError('');
  };

  const handleSubmitComment = async () => {
    if (!commentSheetVideoId) return;
    if (!getStoredSession().token) {
      requireAccount('comment on posts');
      return;
    }

    const trimmed = String(commentDraft || '').trim();
    if (!trimmed) return;

    setCommentSubmitting(true);
    setCommentError('');
    try {
      const response = await commentOnVideo(commentSheetVideoId, trimmed, replyTarget?.commentId);
      setVideoState(commentSheetVideoId, (video) => ({
        ...video,
        ...response.video,
        commentThread: Array.isArray(response.video.commentThread) ? response.video.commentThread : video.commentThread,
      }));
      setCommentDraft('');
      setReplyTarget(null);
      showMessage(replyTarget ? 'Reply sent.' : 'Comment added.');
    } catch (error) {
      setCommentError(error?.response?.data?.message || 'Unable to post your comment. Please try again.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const activeCommentVideo = videos.find((video) => video.id === commentSheetVideoId) || null;
  const activeCommentVideoId = activeCommentVideo?.id;
  const activeCommentThread = buildCommentTree(activeCommentVideo?.commentThread);

  useEffect(() => {
    if (!videoId || new URLSearchParams(location.search).get('comments') !== '1') return;
    const targetVideo = videos.find((video) => String(video.id) === String(videoId));
    if (targetVideo) {
      setCommentSheetVideoId(targetVideo.id);
      setCommentDraft('');
      setReplyTarget(null);
      setCommentError('');
    }
  }, [location.search, videoId, videos]);

  useEffect(() => {
    if (!activeCommentVideoId) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setCommentSheetVideoId(null);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    commentComposerRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCommentVideoId]);

  const handleShare = async (video) => {
    const shareText = `${video.title} by ${video.creatorName}`;
    const sharePath = video.type === 'live' ? `/live/${video.id}` : `/video/${encodeURIComponent(video.id)}`;
    const shareUrl = `${window.location.origin}${sharePath}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, text: shareText, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        showMessage('Post link copied to clipboard.');
      } else {
        showMessage('Share is not available in this browser.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') showMessage('Unable to complete sharing.');
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
    <>
      <DashboardShell
        title={videoId ? 'Video' : 'Your stage'}
        subtitle={videoId ? 'Watching a creator post.' : 'The latest from creators and live comedy.'}
        showBack={Boolean(videoId)}
        backFallback="/home"
      >
      <style>{`
        @keyframes feed-heart-burst {
          0% { opacity: 0; transform: scale(.35) rotate(-10deg); }
          20% { opacity: 1; transform: scale(1.18) rotate(0deg); }
          62% { opacity: 1; transform: scale(1) rotate(0deg); }
          100% { opacity: 0; transform: scale(1.35) rotate(8deg); }
        }
        .feed-heart-burst { animation: feed-heart-burst .85s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .feed-heart-burst { animation: none !important; }
        }
      `}</style>
      <div className="mx-auto grid w-full max-w-[1180px] gap-8 min-[1440px]:grid-cols-[minmax(0,600px)_minmax(260px,320px)] min-[1440px]:items-start">
      <section className="min-w-0">
      {message ? (
        <div role="status" className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${/^(Unable|No media|Share is not)/.test(message) ? 'border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] text-[var(--ochi-accent-light)]' : 'border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-100'}`}>
          {message}
        </div>
      ) : null}

      {!videoId ? <div className="bg-transparent p-0">
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
      </div> : null}

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
          <p className="text-lg font-semibold text-white">{videoId ? 'The post didn’t load.' : 'The room didn’t load.'}</p>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="rounded-full bg-[var(--ochi-accent-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--ochi-accent)]">Try again</button>
            {!getStoredSession().token ? <button type="button" onClick={() => navigate('/login')} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]">Sign in</button> : null}
          </div>
        </div>
      ) : (
        <div className="-mx-4 mt-2 max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain snap-y snap-mandatory sm:mx-0 sm:mt-4 sm:max-h-[calc(100dvh-14rem)] sm:space-y-4 sm:pr-1">
          {videos.length ? (
            videos.map((video) => (
              <article
                key={video.id}
                className="w-full snap-start overflow-hidden sm:rounded-[30px] sm:border sm:border-white/[0.09] sm:bg-[#101114] sm:shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
                onClick={() => {
                  if (video.type === 'live') {
                    navigate(`/live/${video.id}`);
                  } else {
                  }
                }}
              >
                <div
                  className="relative w-full overflow-hidden bg-black sm:rounded-t-[29px]"
                  style={{ aspectRatio: mediaAspectRatios[video.id] || (isVideoType(video) ? '9 / 16' : '4 / 5') }}
                >
                {isVideoType(video) ? (
                  <video
                    ref={(node) => {
                      if (node) videoRefs.current[video.id] = node;
                    }}
                    data-media-src={video.mediaUrl || video.thumbnailUrl}
                    poster={video.thumbnailUrl || video.mediaUrl}
                    muted={mutedVideos[video.id] ?? false}
                    autoPlay
                    loop
                    playsInline
                    preload="none"
                    className="h-full w-full object-contain"
                    onLoadStart={() => setVideoLoadState((current) => ({ ...current, [video.id]: 'loading' }))}
                    onCanPlay={() => setVideoLoadState((current) => ({ ...current, [video.id]: 'ready' }))}
                    onError={() => setVideoLoadState((current) => ({ ...current, [video.id]: 'error' }))}
                    onLoadedMetadata={(event) => {
                      const { videoWidth, videoHeight } = event.currentTarget;
                      if (videoWidth && videoHeight) {
                        setMediaAspectRatios((current) => ({ ...current, [video.id]: videoWidth / videoHeight }));
                      }
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
                    className="h-full w-full object-contain"
                    onLoad={(event) => {
                      const { naturalWidth, naturalHeight } = event.currentTarget;
                      if (naturalWidth && naturalHeight) {
                        setMediaAspectRatios((current) => ({ ...current, [video.id]: naturalWidth / naturalHeight }));
                      }
                    }}
                    onClick={(event) => {
                      if (video.type === 'live') navigate(`/live/${video.id}`);
                      else handlePhotoTap(event, video);
                    }}
                  />
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20" />

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

                {video.creatorUsername && getStoredSession().user?.username !== video.creatorUsername ? (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); handleToggleFollow(video); }}
                    className="absolute left-3 top-3 z-10 rounded-full border border-white/20 bg-black/35 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-xl transition hover:bg-black/55 active:scale-95 sm:left-4 sm:top-4"
                  >
                    {video.isFollowing ? 'Following' : 'Follow'}
                  </button>
                ) : null}

                {isVideoType(video) ? (
                  <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-white/15">
                    <div
                      className="h-full bg-white transition-[width] duration-200"
                      style={{ width: `${Math.min(100, Math.max(0, (videoProgress[video.id] || 0) * 100))}%` }}
                    />
                  </div>
                ) : null}
                <div className="absolute bottom-3 right-3 z-10 flex w-[52px] flex-col items-center gap-0 rounded-[18px] border border-white/15 bg-black/40 p-1 text-white shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:bottom-4 sm:right-4">
                  <button
                    type="button"
                    disabled={pendingLikes.has(video.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleLike(video.id);
                    }}
                    className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition hover:bg-white/10 active:scale-90 disabled:opacity-60"
                    aria-label={video.liked ? 'Unlike post' : 'Like post'}
                    aria-pressed={Boolean(video.liked)}
                  >
                    <span className={video.liked ? 'text-rose-400' : 'text-white'}><FeedIcon type="like" active={video.liked} /></span>
                    <span className="text-[9px] font-medium leading-3 text-slate-200">{formatActionCount(video.likes)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenComments(video);
                    }}
                    className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition hover:bg-white/10 active:scale-90"
                    aria-label="Comment on post"
                  >
                    <span><FeedIcon type="comment" /></span>
                    <span className="text-[9px] font-medium leading-3 text-slate-200">{formatActionCount(video.comments)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleSave(video.id);
                    }}
                    className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition hover:bg-white/10 active:scale-90"
                    aria-label={video.saved ? 'Remove from saved' : 'Save post'}
                    aria-pressed={Boolean(video.saved)}
                  >
                    <span className={video.saved ? 'text-emerald-300' : 'text-white'}><FeedIcon type="save" active={video.saved} /></span>
                    <span className="text-[9px] font-medium leading-3 text-slate-200">{formatActionCount(video.saves || video.savedCount)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleShare(video);
                    }}
                    className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl transition hover:bg-white/10 active:scale-90"
                    aria-label="Share post"
                  >
                    <span><FeedIcon type="share" /></span>
                    <span className="text-[9px] font-medium leading-3 text-slate-200">{formatActionCount(video.shares || video.shareCount)}</span>
                  </button>
                </div>
                </div>

                <div className="flex min-w-0 items-start justify-between gap-4 px-3 py-3 sm:px-5">
                  <div className="min-w-0 flex-1 text-left">
                    <h2 className="line-clamp-1 text-sm font-semibold text-white sm:text-base">{video.title}</h2>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400 sm:text-sm">
                      {video.description || 'Fresh creator content for your feed.'}
                    </p>
                  </div>
                  <div className="max-w-[38%] shrink-0 pt-0.5 text-right">
                    <p className="truncate text-xs font-semibold text-slate-200 sm:text-sm">
                      {video.creatorUsername ? `@${video.creatorUsername}` : video.creatorName}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">{video.creatorName}</p>
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

      {!videoId ? <aside className="hidden min-w-0 min-[1440px]:block">
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
      </aside> : null}
      </div>

      {activeCommentVideo ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setCommentSheetVideoId(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feed-comments-title"
            className="flex h-[min(62dvh,560px)] w-full max-w-xl flex-col overflow-hidden rounded-t-[24px] border border-white/[0.09] bg-[var(--ochi-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:h-[min(68vh,600px)] sm:rounded-[24px]"
          >
            <div className="shrink-0 border-b border-white/[0.07] bg-[var(--ochi-surface)] px-4 pb-3 pt-2.5 sm:px-5 sm:pt-4">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 id="feed-comments-title" className="text-lg font-semibold tracking-tight text-white sm:text-xl">Comments</h3>
                    <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--ochi-accent-light)]">
                      {Number(activeCommentVideo.comments || activeCommentThread.length || 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">
                    Join the conversation on <span className="font-medium text-slate-200">{activeCommentVideo.creatorName || 'this post'}’s post</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCommentSheetVideoId(null);
                    setCommentDraft('');
                    setReplyTarget(null);
                  }}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  aria-label="Close comments"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {activeCommentVideo.title ? <p className="mt-2 truncate text-xs text-slate-500">{activeCommentVideo.title}</p> : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 sm:px-5 sm:py-4">
              {activeCommentThread.length ? (
                <div className="mx-auto max-w-xl space-y-5">
                  {activeCommentThread.map((comment, index) => {
                    const author = comment.userName || 'Creator';
                    const initial = author.charAt(0).toUpperCase() || 'C';
                    const commentText = typeof comment.text === 'string' ? comment.text : '';

                    return (
                      <article key={comment.commentId || `${comment.userId || author}-${index}`} className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface-raised)] text-sm font-semibold text-[var(--ochi-accent-light)]">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-white">{author}</p>
                            <span className="text-xs text-slate-500">· {formatCommentTime(comment.createdAt)}</span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{commentText}</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (!getStoredSession().token) {
                                requireAccount('reply to comments');
                                return;
                              }
                              setReplyTarget({ userName: author, userId: comment.userId || author, commentId: comment.commentId });
                              commentComposerRef.current?.focus();
                            }}
                            className="mt-2 rounded-md text-xs font-semibold text-slate-500 transition hover:text-[var(--ochi-accent-light)] focus-visible:text-[var(--ochi-accent-light)]"
                            disabled={!comment.commentId || activeCommentVideo.allowComments === false}
                          >
                            Reply
                          </button>
                          {comment.replies?.length ? (
                            <div className="mt-3 space-y-4 border-l border-white/[0.1] pl-3 sm:pl-4">
                              {comment.replies.map((reply, replyIndex) => {
                                const replyAuthor = reply.userName || 'Creator';
                                return (
                                  <div key={reply.commentId || `${reply.userId || 'reply'}-${replyIndex}`} className="flex gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[11px] font-semibold text-slate-300">
                                      {replyAuthor.charAt(0).toUpperCase() || 'C'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="truncate text-xs font-semibold text-slate-200">{replyAuthor}</p>
                                        <span className="text-[10px] text-slate-500">· {formatCommentTime(reply.createdAt)}</span>
                                      </div>
                                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-slate-400">{reply.text}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-56 items-center justify-center px-5 text-center">
                  <div className="max-w-xs">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] text-xl text-[var(--ochi-accent-light)]">
                      <FeedIcon type="comment" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-white">Start a good conversation</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">Be the first to share a thought about this post.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/[0.07] bg-[var(--ochi-surface)] px-3 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
              {replyTarget ? (
                <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] px-3 py-2 text-xs text-[var(--ochi-accent-light)]">
                  <span>Replying to <strong>@{replyTarget.userName}</strong></span>
                  <button type="button" onClick={() => setReplyTarget(null)} className="font-semibold text-slate-300 transition hover:text-white">Cancel</button>
                </div>
              ) : null}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmitComment();
                }}
                className="mx-auto flex max-w-xl items-end gap-2 rounded-2xl border border-white/[0.09] bg-black/20 p-1 transition focus-within:border-[var(--ochi-accent-30)]"
              >
                <textarea
                  ref={commentComposerRef}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  maxLength={500}
                  rows={1}
                  placeholder={replyTarget ? `Reply to ${replyTarget.userName}...` : 'Add to the conversation...'}
                  disabled={activeCommentVideo.allowComments === false || commentSubmitting}
                  aria-label={replyTarget ? `Reply to ${replyTarget.userName}` : 'Add a comment'}
                  className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!String(commentDraft || '').trim() || commentSubmitting || activeCommentVideo.allowComments === false}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--ochi-accent)] px-3.5 text-sm font-semibold text-[#190d0a] transition hover:bg-[var(--ochi-accent-light)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {commentSubmitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#190d0a]/30 border-t-[#190d0a]" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <path d="M22 2 15 22l-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M22 2 11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">{commentSubmitting ? 'Posting' : replyTarget ? 'Reply' : 'Send'}</span>
                </button>
              </form>
              <div className="mx-auto mt-2 flex max-w-xl items-center justify-between gap-3 px-1">
                {activeCommentVideo.allowComments === false ? (
                  <p className="text-xs text-slate-500">Comments are disabled for this post.</p>
                ) : commentError ? (
                  <p role="alert" className="text-xs text-rose-300">{commentError}</p>
                ) : (
                  <p className="text-[10px] text-slate-600">Keep it kind. Your words are public.</p>
                )}
                <span className="shrink-0 text-[10px] tabular-nums text-slate-600">{commentDraft.length}/500</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </DashboardShell>
      {signupPromptAction ? <SignUpPrompt action={signupPromptAction} onClose={closeSignupPrompt} onSignUp={openSignup} onSignIn={openLogin} /> : null}
    </>
  );
}

export default HomePage;
