import { useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { getStoredSession } from '../utils/session';

const MAX_MESSAGE_LENGTH = 400;

export default function LiveRoomChat({ room, onRemoveParticipant }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [moderatingId, setModeratingId] = useState('');
  const [moderationMessage, setModerationMessage] = useState('');
  const [participants, setParticipants] = useState([]);
  const listRef = useRef(null);
  const user = getStoredSession().user;

  useEffect(() => {
    setMessages([]);
    setDraft('');
    setError('');
    if (!room) return undefined;
    const syncParticipants = () => setParticipants(Array.from(room.remoteParticipants.values()));
    syncParticipants();

    const handleChatMessage = (message, participant) => {
      const entry = {
        id: message.id,
        text: message.message,
        name: participant?.name || participant?.identity || 'Viewer',
        identity: participant?.identity || '',
        timestamp: message.timestamp,
      };
      setMessages((current) => current.some((item) => item.id === entry.id) ? current : [...current, entry].slice(-100));
    };

    room.on(RoomEvent.ChatMessage, handleChatMessage);
    room.on(RoomEvent.ParticipantConnected, syncParticipants);
    room.on(RoomEvent.ParticipantDisconnected, syncParticipants);
    return () => {
      room.off(RoomEvent.ChatMessage, handleChatMessage);
      room.off(RoomEvent.ParticipantConnected, syncParticipants);
      room.off(RoomEvent.ParticipantDisconnected, syncParticipants);
    };
  }, [room]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !room || sending) return;
    setSending(true);
    setError('');
    try {
      const sent = await room.localParticipant.sendChatMessage(message);
      setMessages((current) => current.some((item) => item.id === sent.id) ? current : [...current, {
        id: sent.id,
        text: sent.message,
        name: room.localParticipant.name || user?.name || 'You',
        identity: room.localParticipant.identity,
        timestamp: sent.timestamp,
      }].slice(-100));
      setDraft('');
    } catch (sendError) {
      setError(sendError?.message || 'Message could not be sent. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  const removeParticipant = async (participant) => {
    if (!onRemoveParticipant || !participant?.identity) return;
    setModeratingId(participant.identity);
    setModerationMessage('');
    try {
      await onRemoveParticipant(participant.identity);
      setModerationMessage(`${participant.name || participant.identity} was removed from the room.`);
    } catch (moderationError) {
      setModerationMessage(moderationError?.response?.data?.message || moderationError?.message || 'Could not remove this participant.');
    } finally {
      setModeratingId('');
    }
  };

  return (
    <section className="flex min-h-[260px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70" aria-label="Live chat">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Live chat</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Live-only chat; messages aren’t saved after the room ends.</p>
        </div>
        <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-400">{messages.length}</span>
      </header>
      <div ref={listRef} className="min-h-28 flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite" aria-relevant="additions">
        {messages.length ? messages.map((message) => (
          <article key={message.id} className="text-xs">
            <p className="font-semibold text-slate-300">{message.name}</p>
            <p className="mt-0.5 break-words leading-5 text-slate-200">{message.text}</p>
          </article>
        )) : <p className="py-4 text-center text-xs text-slate-500">Start the conversation.</p>}
      </div>
      {onRemoveParticipant ? (
        <details className="border-t border-white/10 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-slate-400">Manage viewers ({participants.length})</summary>
          <div className="mt-2 space-y-1">
            {participants.map((participant) => (
              <div key={participant.identity} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2">
                <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{participant.name || participant.identity}</span>
                <button type="button" disabled={Boolean(moderatingId)} onClick={() => removeParticipant(participant)} className="rounded-full border border-rose-400/20 px-2.5 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">
                  {moderatingId === participant.identity ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
            {!participants.length ? <p className="py-2 text-xs text-slate-500">No viewers connected.</p> : null}
          </div>
        </details>
      ) : null}
      {moderationMessage ? <p role="status" className="px-3 py-1 text-xs text-slate-400">{moderationMessage}</p> : null}
      <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-white/10 p-3">
        <label className="sr-only" htmlFor="live-chat-message">Write a chat message</label>
        <input id="live-chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={MAX_MESSAGE_LENGTH} placeholder="Say something kind…" disabled={!room || sending} className="min-w-0 flex-1 rounded-full border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none" />
        <button type="submit" disabled={!draft.trim() || sending || !room} className="rounded-full bg-[var(--ochi-accent)] px-3.5 py-2 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{sending ? 'Sending' : 'Send'}</button>
      </form>
      {error ? <p role="alert" className="px-3 pb-3 text-xs text-rose-200">{error}</p> : null}
    </section>
  );
}
