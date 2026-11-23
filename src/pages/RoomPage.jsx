import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getRoomPosts, createRoomPost, likeRoomPost, commentRoomPost, uploadVideoFile } from '../api/dashboardApi';
import { getStoredSession } from '../utils/session';

export default function RoomPage() {
  const { roomKey } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [media, setMedia] = useState(null);
  const [error, setError] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const session = getStoredSession();
  const isJokes = roomKey === 'jokes';
  const roomLabel = isJokes ? 'Jokes' : 'Dark Humor';

  const load = () => getRoomPosts(roomKey).then(setRoomData).catch((requestError) => setError(requestError?.response?.data?.message || 'Unable to load this room.'));

  useEffect(() => {
    setLoading(true);
    getRoomPosts(roomKey)
      .then(setRoomData)
      .catch((requestError) => setError(requestError?.response?.data?.message || 'Unable to load this room.'))
      .finally(() => setLoading(false));
  }, [roomKey]);

  const handleMedia = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isJokes && file.type.startsWith('video/')) {
      setError('Jokes rooms do not allow videos.');
      event.target.value = '';
      return;
    }
    setMedia({ file, preview: URL.createObjectURL(file), mediaType: file.type.startsWith('video/') ? 'video' : 'photo' });
  };

  const submitPost = async () => {
    if (!session.token) {
      navigate('/login');
      return;
    }
    if (!text.trim() && !media) {
      setError('Add text or media before posting.');
      return;
    }
    setPosting(true);
    setError('');
    try {
      let mediaUrl = '';
      let thumbnailUrl = '';
      let mediaType = 'text';
      if (media) {
        mediaType = media.mediaType;
        const form = new FormData();
        form.append('file', media.file);
        const uploaded = await uploadVideoFile(form);
        mediaUrl = uploaded.mediaUrl || uploaded.url;
        thumbnailUrl = uploaded.thumbnailUrl || mediaUrl;
      }
      await createRoomPost(roomKey, { text, mediaUrl, thumbnailUrl, mediaType });
      setText('');
      setMedia(null);
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to publish to this room.');
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId) => {
    if (!session.token) {
      navigate('/login');
      return;
    }
    try {
      const result = await likeRoomPost(postId);
      setRoomData((current) => ({ ...current, posts: current.posts.map((post) => post.id === postId ? result.post : post) }));
    } catch {
      setError('Unable to update the like.');
    }
  };

  const submitComment = async (postId) => {
    if (!session.token) {
      navigate('/login');
      return;
    }
    const draft = String(commentDrafts[postId] || '').trim();
    if (!draft) return;
    try {
      const result = await commentRoomPost(postId, draft);
      setRoomData((current) => ({ ...current, posts: current.posts.map((post) => post.id === postId ? result.post : post) }));
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    } catch {
      setError('Unable to add the comment.');
    }
  };

  const posts = roomData?.posts || [];
  const ads = roomData?.ads || [];

  return (
    <DashboardShell title={roomLabel} subtitle="Weekly room challenge" showSearch={false} showBack backFallback="/discover">
      <div className="mx-auto w-full max-w-[720px]">
        <header className="sticky top-14 z-20 -mx-3 mb-3 border-b border-white/[0.07] bg-[#090a0d]/95 px-3 py-3 backdrop-blur-xl sm:mx-0 sm:top-16 sm:rounded-2xl sm:border">
          <div className="flex items-center gap-3">
            <img src={isJokes ? '/room-assets/jokes.jpeg' : '/room-assets/dark-humor.jpeg'} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[var(--ochi-accent-30)]" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black text-white">{roomLabel}</h1>
              <p className="text-xs text-slate-500">{isJokes ? 'Text and photos' : 'Text, photos, and videos'} · $7 weekly challenge</p>
            </div>
            <button type="button" onClick={() => navigate('/discover')} className="text-xs font-bold text-[var(--ochi-accent-light)]">Rooms</button>
          </div>
        </header>

        {error ? <p role="alert" className="mb-3 rounded-2xl border border-[var(--ochi-accent-30)] bg-[var(--ochi-accent-10)] px-4 py-3 text-sm text-[var(--ochi-accent-light)]">{error}</p> : null}

        <section className="mb-4 rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] p-3">
          {media?.preview ? (
            <div className="relative mb-3 overflow-hidden rounded-2xl bg-black">
              {media.mediaType === 'video' ? <video src={media.preview} controls className="max-h-[360px] w-full object-contain" /> : <img src={media.preview} alt="Post preview" className="max-h-[360px] w-full object-contain" />}
              <button type="button" onClick={() => setMedia(null)} className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-bold text-white">Remove</button>
            </div>
          ) : null}
          <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} rows={3} placeholder={`Post to ${roomLabel}...`} className="w-full resize-none rounded-xl bg-transparent px-2 py-2 text-[15px] font-semibold leading-6 text-white outline-none placeholder:text-slate-500" />
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
            <input ref={fileRef} type="file" accept={isJokes ? 'image/*' : 'image/*,video/*'} onChange={handleMedia} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-bold text-slate-300">
              <span aria-hidden="true">＋</span> {isJokes ? 'Photo' : 'Photo or video'}
            </button>
            <button type="button" onClick={submitPost} disabled={posting} className="h-10 rounded-full bg-[var(--ochi-accent)] px-5 text-xs font-black text-[#11130b] disabled:opacity-50">{posting ? 'Posting…' : 'Post'}</button>
          </div>
        </section>

        {loading ? <p className="py-12 text-center text-sm text-slate-500">Loading room…</p> : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="space-y-3">
              <article className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[var(--ochi-surface)]">
                <div className="flex items-center gap-3 px-4 pt-4">
                  {post.creatorProfilePictureUrl ? <img src={post.creatorProfilePictureUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ochi-accent-15)] text-sm font-black text-[var(--ochi-accent-light)]">{post.creatorName?.charAt(0)?.toUpperCase() || 'O'}</span>}
                  <div className="min-w-0"><p className="truncate text-sm font-black text-white">{post.creatorName}</p><p className="truncate text-xs text-slate-500">@{post.creatorUsername || 'creator'}</p></div>
                </div>
                {post.mediaUrl ? (
                  post.mediaType === 'video' ? <video src={post.mediaUrl} poster={post.thumbnailUrl} controls playsInline className="mt-3 max-h-[70vh] w-full bg-black object-contain" /> : <img src={post.mediaUrl} alt={post.text || 'Room post'} className="mt-3 max-h-[70vh] w-full object-contain" />
                ) : null}
                {post.text ? <p className="whitespace-pre-wrap px-4 py-4 text-[15px] font-semibold leading-6 text-slate-100">{post.text}</p> : null}
                <div className="flex items-center gap-5 border-t border-white/[0.07] px-4 py-3">
                  <button type="button" onClick={() => toggleLike(post.id)} className={`text-sm font-black ${post.likedBy?.includes(session.user?.id) ? 'text-[#ff1744]' : 'text-slate-300'}`}>♥ <span className="ml-1 text-xs">{post.likes}</span></button>
                  <button type="button" onClick={() => document.getElementById(`room-comment-${post.id}`)?.focus()} className="text-sm font-black text-slate-300">••• <span className="ml-1 text-xs">{post.comments?.length || 0}</span></button>
                </div>
                {post.comments?.length ? (
                  <div className="space-y-2 border-t border-white/[0.05] px-4 py-3">
                    {post.comments.slice(-3).map((comment) => <p key={comment.id} className="text-xs leading-5 text-slate-300"><span className="font-bold text-white">{comment.creatorName}: </span>{comment.text}</p>)}
                  </div>
                ) : null}
                <form onSubmit={(event) => { event.preventDefault(); submitComment(post.id); }} className="flex gap-2 border-t border-white/[0.07] px-3 py-3">
                  <input id={`room-comment-${post.id}`} value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Add a comment…" className="min-w-0 flex-1 rounded-full border border-white/[0.08] bg-black/20 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500" />
                  <button type="submit" className="rounded-full bg-[var(--ochi-accent)] px-4 text-xs font-black text-[#11130b]">Send</button>
                </form>
              </article>
              {ads.length ? (() => {
                const ad = ads[posts.indexOf(post) % ads.length];
                const external = /^https?:\/\//i.test(ad.ctaUrl || '');
                return (
                  <article key={`${post.id}-${ad.id}`} aria-label={`Sponsored: ${ad.name}`} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black px-3 py-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-[#11130b]" style={{ backgroundColor: ad.accent || '#c5e84c' }}>{ad.logoText || ad.name?.charAt(0) || 'A'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">{ad.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{ad.description || ad.title}</p>
                    </div>
                    {ad.ctaUrl ? <a href={ad.ctaUrl} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-slate-200">{ad.ctaText || 'Learn more'}</a> : null}
                    <span className="text-[10px] font-bold uppercase text-slate-600">Ad</span>
                  </article>
                );
              })() : null}
              </div>
            ))}
            {!posts.length ? <div className="rounded-[22px] border border-dashed border-white/[0.09] py-12 text-center"><p className="text-sm font-bold text-slate-300">Be the first to post</p><p className="mt-1 text-xs text-slate-500">Start this week’s conversation.</p></div> : null}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
