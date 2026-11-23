import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Room, RoomEvent } from 'livekit-client';
import DashboardShell from '../components/DashboardShell';
import { getLiveRoomViewerToken } from '../api/dashboardApi';
import LiveRoomChat from '../components/LiveRoomChat';

function RemoteVideoCard({ participant }) {
  const viewerRef = useRef(null);

  useEffect(() => {
    const node = viewerRef.current;
    if (!node || !participant?.videoTrack) {
      return undefined;
    }

    const mediaElement = participant.videoTrack.attach();
    mediaElement.muted = true;
    mediaElement.autoplay = true;
    mediaElement.playsInline = true;
    mediaElement.style.width = '100%';
    mediaElement.style.height = '100%';
    mediaElement.style.objectFit = 'cover';
    node.innerHTML = '';
    node.appendChild(mediaElement);

    return () => {
      participant.videoTrack.detach();
      if (node) {
        node.innerHTML = '';
      }
    };
  }, [participant?.id, participant?.videoTrack]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-slate-950">
      <div ref={viewerRef} className="h-full w-full" />
      {!participant?.videoTrack ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-center text-sm text-slate-300">
          Waiting for the host to start streaming...
        </div>
      ) : null}
    </div>
  );
}

export default function LiveViewerPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const roomRef = useRef(null);
  const [status, setStatus] = useState('Connecting to stream...');
  const [participants, setParticipants] = useState([]);
  const [roomMeta, setRoomMeta] = useState(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [shareStatus, setShareStatus] = useState('');
  const [connectionQuality, setConnectionQuality] = useState('unknown');

  useEffect(() => {
    let isUnmounted = false;
    setConnectionQuality('unknown');

    const syncParticipants = (room) => {
      const nextParticipants = Array.from(room.remoteParticipants.values()).map((participant) => {
        const videoPublication = Array.from(participant.videoTrackPublications.values()).find((publication) => publication?.track && publication.isSubscribed);
        return {
          id: participant.identity,
          name: participant.name || participant.identity,
          videoTrack: videoPublication?.track || null,
        };
      });
      if (!isUnmounted) {
        setParticipants(nextParticipants);
      }
    };

    const joinRoom = async () => {
      if (!roomId) {
        setStatus('No room selected.');
        return;
      }

      try {
        const data = await getLiveRoomViewerToken(roomId);
        if (isUnmounted) return;
        setRoomMeta(data);

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720 },
          },
        });

        roomRef.current = room;

        room.on(RoomEvent.ParticipantConnected, () => syncParticipants(room));
        room.on(RoomEvent.ParticipantDisconnected, () => syncParticipants(room));
        room.on(RoomEvent.TrackSubscribed, () => syncParticipants(room));
        room.on(RoomEvent.TrackUnsubscribed, () => syncParticipants(room));
        room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          if (!isUnmounted && participant === room.localParticipant) setConnectionQuality(quality);
        });
        room.on(RoomEvent.Reconnecting, () => { if (!isUnmounted) setConnectionQuality('reconnecting'); });
        room.on(RoomEvent.Reconnected, () => { if (!isUnmounted) setConnectionQuality(room.localParticipant.connectionQuality); });
        room.on(RoomEvent.Disconnected, () => {
          if (!isUnmounted) {
            setStatus('The stream has ended.');
            setParticipants([]);
            setConnectionQuality('lost');
          }
        });

        await room.connect(data.livekitUrl, data.token);
        if (isUnmounted) return;

        syncParticipants(room);
        setConnectionQuality(room.localParticipant.connectionQuality);
        setStatus(room.remoteParticipants.size ? 'Live stream connected.' : 'Waiting for the host to start streaming...');
      } catch (error) {
        if (!isUnmounted) {
          setStatus(error?.response?.data?.message || error?.message || 'Unable to join this live room.');
        }
      }
    };

    joinRoom();

    return () => {
      isUnmounted = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomId, connectionAttempt]);

  const primaryParticipant = participants[0] || null;

  const hostLabel = (roomMeta?.roomName || 'Live room').split(' ')[0] || 'Creator';
  const canRetry = !primaryParticipant && /unable|ended|failed|connect/i.test(status);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: roomMeta?.roomName || 'Live room on Ochi', url: window.location.href });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        setShareStatus('Sharing is not available in this browser.');
        return;
      }
      setShareStatus('Thanks for sharing the room.');
    } catch (error) {
      if (error?.name !== 'AbortError') setShareStatus('Could not share this room. Please try again.');
    }
  };

  return (
    <DashboardShell
      title={roomMeta?.roomName || 'Live Room'}
      subtitle="Watching a live Ochi session"
      showBack
      backFallback="/discover"
    >
      <div className="mx-auto grid w-full max-w-[1180px] gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
        <div className="min-w-0 overflow-hidden rounded-[30px] border border-white/[0.08] bg-[var(--ochi-surface)] p-3 shadow-[0_25px_80px_rgba(0,0,0,0.32)] sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ochi-accent)] text-sm font-bold text-white">
                {hostLabel.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="ochi-kicker">Live now</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-2xl">{roomMeta?.roomName || 'Room stream'}</h2>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--ochi-accent-20)] bg-[var(--ochi-accent-10)] px-2.5 py-1 text-xs font-semibold text-[var(--ochi-accent-light)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--ochi-accent)]" />
              Live
            </div>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-[24px] border border-white/[0.07] bg-black">
            {primaryParticipant ? (
              <RemoteVideoCard participant={primaryParticipant} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-lg text-[var(--ochi-accent-light)]">
                  {canRetry ? '!' : <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[var(--ochi-accent)]" />}
                </span>
                <p className="max-w-md text-sm leading-6 text-slate-300">{status}</p>
                {canRetry ? <button type="button" onClick={() => { setParticipants([]); setStatus('Reconnecting to stream…'); setConnectionAttempt((attempt) => attempt + 1); }} className="mt-4 rounded-full bg-[var(--ochi-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">Reconnect</button> : null}
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--ochi-accent)]" />
                LIVE
              </div>
              <div className="rounded-full border border-white/10 bg-slate-950/45 px-2.5 py-1 text-[10px] font-medium text-slate-100 backdrop-blur-sm">
                {participants.length ? `${participants.length} watching` : 'Waiting'}
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <div className="rounded-[20px] border border-white/10 bg-slate-950/60 p-3 shadow-[0_16px_44px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="ochi-kicker">Now featuring</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">{roomMeta?.roomName || 'Live performance'}</h3>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">A live room on Ochi Live. Settle in and watch the moment as it unfolds.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-300">
              <span className="font-semibold text-white">{participants.length.toLocaleString()}</span> {participants.length === 1 ? 'viewer connected' : 'viewers connected'}
            </div>
            <p className="text-xs text-slate-400" role="status">Connection quality: <span className="font-semibold capitalize text-slate-200">{connectionQuality === 'unknown' ? 'checking' : connectionQuality}</span></p>
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Browse more live rooms
            </button>
          </div>
          {shareStatus ? <p role="status" className="mt-3 text-xs text-slate-400">{shareStatus}</p> : null}
        </div>
        <aside className="space-y-4">
          <LiveRoomChat room={roomRef.current} />
          <div className="rounded-[26px] border border-white/[0.08] bg-[var(--ochi-surface)] p-5">
            <p className="ochi-kicker">Inside the room</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Watch together.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Live sessions are best shared. Invite someone in and make this a moment.</p>
            <button type="button" onClick={handleShare} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--ochi-accent)] px-4 text-sm font-semibold text-white transition hover:brightness-110">
              <span aria-hidden="true">↗</span> Share this room
            </button>
          </div>
          <div className="rounded-[26px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_100%_0%,rgba(255,255,255,0.06),transparent_52%),linear-gradient(145deg,#17191f,#111318)] p-5">
            <p className="ochi-kicker">Keep exploring</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Find another live set, discover a fresh voice, or join the feed.</p>
            <button type="button" onClick={() => navigate('/home')} className="mt-4 text-sm font-semibold text-[var(--ochi-accent-light)] transition hover:text-white">Back to your stage →</button>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
