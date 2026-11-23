import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell';
import { getRooms, getRoomPayoutBanks, getRoomPayoutSettings, saveRoomPayoutSettings } from '../api/dashboardApi';
import { getStoredSession } from '../utils/session';

const remainingLabel = (seconds) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
};

export default function RoomsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [contestRemaining, setContestRemaining] = useState(null);
  const [error, setError] = useState('');
  const [viewedTopIds, setViewedTopIds] = useState([]);
  const [adAfterTopIds, setAdAfterTopIds] = useState([]);
  const [payout, setPayout] = useState(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutCurrency, setPayoutCurrency] = useState('USD');
  const [payoutBanks, setPayoutBanks] = useState([]);
  const [payoutBankCode, setPayoutBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState(getStoredSession().user?.name || '');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState('');
  const [payoutMessage, setPayoutMessage] = useState('');
  const isAuthenticated = Boolean(getStoredSession().token);
  const topAdStorageKey = `ochi-rooms-top-ad-state:${getStoredSession().user?.id || getStoredSession().user?.username || 'guest'}`;

  useEffect(() => {
    getRooms().then(setData).catch((requestError) => setError(requestError?.response?.data?.message || 'Unable to load Ochi Rooms.'));
  }, []);

  useEffect(() => {
    if (!data?.contest?.endAt) return undefined;
    const updateRemaining = () => Math.max(0, Math.floor((new Date(data.contest.endAt).getTime() - Date.now()) / 1000));
    setContestRemaining(updateRemaining());
    const timer = window.setInterval(() => {
      const remaining = updateRemaining();
      setContestRemaining(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        getRooms()
          .then(setData)
          .catch((requestError) => setError(requestError?.response?.data?.message || 'Unable to refresh the completed contest.'));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data?.contest?.endAt]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getRoomPayoutSettings().then(setPayout).catch((requestError) => setPayoutError(requestError?.response?.data?.message || 'Unable to load prize payout settings.'));
  }, [isAuthenticated]);

  useEffect(() => {
    try {
      const state = JSON.parse(localStorage.getItem(topAdStorageKey) || '{}');
      setViewedTopIds(Array.isArray(state.viewedIds) ? state.viewedIds.map(String) : []);
      setAdAfterTopIds(Array.isArray(state.adAfterIds) ? state.adAfterIds.map(String) : []);
    } catch {
      setViewedTopIds([]);
      setAdAfterTopIds([]);
    }
  }, [topAdStorageKey]);

  useEffect(() => {
    if (!payoutOpen) return;
    let active = true;
    setPayoutError('');
    getRoomPayoutBanks(payoutCurrency)
      .then((banks) => { if (active) setPayoutBanks(banks); })
      .catch((requestError) => {
        if (active) {
          setPayoutBanks([]);
          setPayoutError(requestError?.response?.data?.message || 'Unable to load banks for this currency.');
        }
      });
    return () => { active = false; };
  }, [payoutOpen, payoutCurrency]);

  const submitPayoutSettings = async (event) => {
    event.preventDefault();
    const bank = payoutBanks.find((item) => item.code === payoutBankCode);
    if (!bank) {
      setPayoutError('Choose a bank for your payout currency.');
      return;
    }
    setPayoutLoading(true);
    setPayoutError('');
    setPayoutMessage('');
    try {
      const result = await saveRoomPayoutSettings({
        currency: payoutCurrency,
        bankCode: bank.code,
        bankName: bank.name,
        accountNumber,
        name: accountName,
      });
      setPayout(result.payout);
      setPayoutMessage(result.transfers?.length ? 'Payout details saved. Eligible prize transfers were submitted to Paystack.' : 'Payout details saved. Eligible prizes will be transferred when a weekly contest closes.');
      setAccountNumber('');
    } catch (requestError) {
      setPayoutError(requestError?.response?.data?.message || 'Unable to save prize payout details.');
    } finally {
      setPayoutLoading(false);
    }
  };

  const openTopPost = (post) => {
    const id = String(post.id || post.roomKey || '');
    if (!viewedTopIds.includes(id)) {
      const nextViewedIds = [...viewedTopIds, id];
      const nextAdAfterIds = nextViewedIds.length % 3 === 0 ? [...adAfterTopIds, id] : adAfterTopIds;
      try {
        localStorage.setItem(topAdStorageKey, JSON.stringify({ viewedIds: nextViewedIds, adAfterIds: nextAdAfterIds }));
      } catch {
        setError('Top-post ad frequency cannot be saved on this device. Ads may repeat after a reload.');
      }
      setViewedTopIds(nextViewedIds);
      setAdAfterTopIds(nextAdAfterIds);
    }
    if (post.roomKey) navigate(`/rooms/${post.roomKey}`);
  };

  const rooms = data?.rooms || [
    { key: 'dark-humor', label: 'Dark Humor', active: true, avatar: '/room-assets/dark-humor.jpeg' },
    { key: 'jokes', label: 'Jokes', active: true, avatar: '/room-assets/jokes.jpeg' },
    { key: 'open-mic', label: 'Open Mic', active: false },
    { key: 'story-battle', label: 'Story Battle', active: false },
  ];
  const topItems = (data?.top?.length ? data.top : rooms.slice(0, 2).map((room, index) => ({ id: room.key, creatorProfilePictureUrl: room.avatar, likes: 0, creatorName: room.label, roomKey: room.key, index }))).slice(0, 20);
  const roomAds = data?.ads || [];

  return (
    <DashboardShell title="Rooms" subtitle="Weekly challenges, ranked posts, and community conversations" showSearch={false}>
      <div className="mx-auto w-full max-w-[1180px]">
        {error ? <p role="alert" className="mb-4 rounded-2xl border border-[var(--ochi-accent-30)] bg-[var(--ochi-accent-10)] px-4 py-3 text-sm text-[var(--ochi-accent-light)]">{error}</p> : null}

        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-black px-5 py-5 sm:px-7 sm:py-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ochi-accent-light)]">Ochi contests</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">Compete for likes and win $7</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">The most-liked post across both rooms wins the weekly Sunday-to-Sunday $7 prize. Previous rounds and posts stay available.</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/10 bg-[var(--ochi-surface-raised)] px-4 py-3 text-right">
              <p className="text-xl font-black text-[var(--ochi-accent)]">{contestRemaining === null ? '—' : remainingLabel(contestRemaining)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">left · UTC</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 overflow-x-auto pb-1">
            {topItems.map((post, index) => {
              const ad = roomAds.length && adAfterTopIds.includes(String(post.id || post.roomKey))
                ? roomAds[Math.max(0, adAfterTopIds.indexOf(String(post.id || post.roomKey))) % roomAds.length]
                : null;
              return (
                <div key={post.id || post.roomKey} className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openTopPost(post)}
                    className="w-20 shrink-0 text-center sm:w-24"
                    aria-label={`Top ${index + 1} room post`}
                  >
                    <span className="mx-auto block h-16 w-16 rounded-full border-2 border-[var(--ochi-accent)] p-1 sm:h-20 sm:w-20">
                      {post.creatorProfilePictureUrl ? <img src={post.creatorProfilePictureUrl} alt="" className="h-full w-full rounded-full object-cover" /> : <span className="flex h-full w-full items-center justify-center rounded-full bg-[var(--ochi-accent-15)] text-lg font-black text-[var(--ochi-accent-light)]">{index + 1}</span>}
                    </span>
                    <span className="mt-2 block truncate text-[10px] font-bold text-slate-300">{post.creatorName || 'Top post'}</span>
                    <span className="block text-[9px] text-slate-500">{post.likes || 0} likes</span>
                  </button>
                  {ad ? (
                    <div aria-label={`Sponsored: ${ad.name}`} className="flex w-52 items-center gap-2 rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface-raised)] p-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black text-[#11130b]" style={{ backgroundColor: ad.accent || '#c5e84c' }}>{ad.logoText || 'A'}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-bold text-white">{ad.name}</span><span className="mt-0.5 block line-clamp-2 text-[9px] leading-4 text-slate-400">{ad.description || ad.title}</span></span>
                      <span className="text-[9px] font-bold uppercase text-slate-500">Ad</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {data?.history?.length ? (
          <section aria-label="Previous weekly winners" className="mt-5 rounded-[24px] border border-white/[0.08] bg-[var(--ochi-surface)] p-5">
            <h2 className="text-sm font-black text-white">Previous weekly winners</h2>
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {data.history.map((round) => (
                <li key={round.id || round.startAt} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
                  <span className="text-slate-400">{new Date(round.startAt).toLocaleDateString()} – {new Date(round.endAt).toLocaleDateString()}</span>
                  {round.winner ? <span className="font-bold text-white">{round.winner.name} · {round.winner.likes} likes · ${round.prizeAmount} {round.prizeCurrency} ({round.payoutStatus === 'paid' ? 'paid' : round.payoutStatus === 'processing' ? 'transfer processing' : round.payoutStatus === 'failed' ? 'manual payout required' : 'payout pending'})</span> : <span className="text-slate-500">No eligible posts</span>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-5 rounded-[24px] border border-white/[0.08] bg-[var(--ochi-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-white">Prize payout</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">Configure a Paystack bank recipient to receive a future weekly prize. Account numbers are sent directly to Paystack; Ochi stores only the recipient code and a masked account label.</p>
            </div>
            {isAuthenticated ? (
              <button type="button" onClick={() => setPayoutOpen((open) => !open)} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white">{payoutOpen ? 'Close' : payout?.configured ? 'Update payout details' : 'Set up payout'}</button>
            ) : <button type="button" onClick={() => navigate('/login')} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white">Sign in to set up</button>}
          </div>
          {payout?.configured ? <p className="mt-3 text-xs font-bold text-[var(--ochi-accent-light)]">{payout.accountName} · {payout.bankName} · •••• {payout.accountLast4} · {payout.currency}</p> : null}
          {payoutError ? <p role="alert" className="mt-3 text-xs text-rose-300">{payoutError}</p> : null}
          {payoutMessage ? <p role="status" className="mt-3 text-xs text-emerald-200">{payoutMessage}</p> : null}
          {payoutOpen && isAuthenticated ? (
            <form onSubmit={submitPayoutSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-bold text-slate-300">
                Prize payout currency
                <select value={payoutCurrency} onChange={(event) => { setPayoutCurrency(event.target.value); setPayoutBankCode(''); }} className="h-11 rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white">
                  <option value="USD">USD ($7 prize)</option>
                  <option value="NGN">NGN (converted at the configured rate)</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-300">
                Bank
                <select required value={payoutBankCode} onChange={(event) => setPayoutBankCode(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white">
                  <option value="">Choose a supported bank</option>
                  {payoutBanks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-300">
                Account holder name
                <input required value={accountName} onChange={(event) => setAccountName(event.target.value)} autoComplete="name" className="h-11 rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white" />
              </label>
              <label className="grid gap-1 text-xs font-bold text-slate-300">
                Account number
                <input required inputMode="numeric" autoComplete="off" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white" />
              </label>
              <p className="text-[11px] leading-5 text-slate-500 sm:col-span-2">Transfers happen after a round closes, only if Paystack supports the selected currency and bank. NGN payouts require `USD_TO_NGN_RATE`; unsupported or unconfirmed transfers remain pending and are never silently converted.</p>
              <button type="submit" disabled={payoutLoading || payoutBanks.length === 0} className="h-11 rounded-full bg-[var(--ochi-accent)] px-5 text-xs font-black text-[#11130b] disabled:opacity-50 sm:col-span-2">{payoutLoading ? 'Saving…' : 'Save payout details'}</button>
            </form>
          ) : null}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Ochi Rooms">
          {rooms.map((room) => (
            <button
              key={room.key}
              type="button"
              disabled={!room.active}
              onClick={() => room.active && navigate(`/rooms/${room.key}`)}
              className={`relative min-h-44 overflow-hidden rounded-[24px] border p-5 text-left transition sm:min-h-52 ${
                room.active
                  ? 'border-white/[0.09] bg-[var(--ochi-surface-raised)] hover:border-[var(--ochi-accent-40)] hover:bg-[var(--ochi-accent-10)]'
                  : 'cursor-not-allowed border-white/[0.05] bg-white/[0.025] opacity-60'
              }`}
            >
              {!room.active ? <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Coming soon</span> : null}
              {room.avatar ? <img src={room.avatar} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10 sm:h-20 sm:w-20" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-white/10 text-2xl text-slate-600 sm:h-20 sm:w-20">•••</span>}
              <h2 className="mt-5 text-xl font-black tracking-tight text-white sm:text-2xl">{room.label}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">{room.active ? (room.key === 'jokes' ? 'Text and photos only' : 'Text, photos, and videos') : 'A new challenge is coming soon'}</p>
            </button>
          ))}
        </section>
      </div>
    </DashboardShell>
  );
}
