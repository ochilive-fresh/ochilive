import { useEffect, useState } from 'react';
import { getRoomPayoutBanks, getRoomPayoutSettings, saveRoomPayoutSettings } from '../../api/dashboardApi';
import { getStoredSession } from '../../utils/session';

export default function RoomPrizePayoutSettings() {
  const [payout, setPayout] = useState(null);
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [banks, setBanks] = useState([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState(getStoredSession().user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getRoomPayoutSettings()
      .then((result) => { if (active) setPayout(result); })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Unable to load prize payout settings.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setError('');
    getRoomPayoutBanks(currency)
      .then((result) => { if (active) setBanks(result); })
      .catch((requestError) => {
        if (active) {
          setBanks([]);
          setError(requestError?.response?.data?.message || 'Unable to load banks for this currency.');
        }
      });
    return () => { active = false; };
  }, [open, currency]);

  const saveSettings = async (event) => {
    event.preventDefault();
    const bank = banks.find((item) => item.code === bankCode);
    if (!bank) {
      setError('Choose a bank for your payout currency.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await saveRoomPayoutSettings({
        currency,
        bankCode: bank.code,
        bankName: bank.name,
        accountNumber,
        name: accountName,
      });
      setPayout(result.payout);
      setMessage(result.transfers?.length
        ? 'Payout details saved. Eligible prize transfers were submitted to Paystack.'
        : 'Payout details saved. Eligible prizes will be transferred when a weekly contest closes.');
      setAccountNumber('');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to save prize payout details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[var(--ochi-surface)] p-4 sm:p-5" aria-labelledby="room-prize-payout-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Contest prizes</p>
          <h2 id="room-prize-payout-title" className="mt-1 text-lg font-semibold text-white">Prize payout account</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Set a Paystack bank account for automatic weekly contest prizes. Ochi stores a recipient code and masked account details, not your account number.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="min-h-10 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.06]">
          {open ? 'Close' : payout?.configured ? 'Update account' : 'Set up account'}
        </button>
      </div>

      {payout?.configured ? <p className="mt-3 text-sm font-medium text-slate-200">{payout.accountName} · {payout.bankName} · •••• {payout.accountLast4} · {payout.currency}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {message ? <p role="status" className="mt-3 text-sm text-emerald-200">{message}</p> : null}

      {open ? (
        <form onSubmit={saveSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-slate-300">
            Prize currency
            <select value={currency} onChange={(event) => { setCurrency(event.target.value); setBankCode(''); }} className="h-11 rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white">
              <option value="USD">USD ($7 prize)</option>
              <option value="NGN">NGN (converted at the configured rate)</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-300">
            Bank
            <select required value={bankCode} onChange={(event) => setBankCode(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white">
              <option value="">Choose a supported bank</option>
              {banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-300">
            Account holder name
            <input required value={accountName} onChange={(event) => setAccountName(event.target.value)} autoComplete="name" className="h-11 rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-300">
            Account number
            <input required inputMode="numeric" autoComplete="off" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white" />
          </label>
          <p className="text-[11px] leading-5 text-slate-500 sm:col-span-2">Transfers happen after a round closes, only if Paystack supports the selected currency and bank. NGN payouts require `USD_TO_NGN_RATE`; unsupported or unconfirmed transfers remain pending and are never silently converted.</p>
          <button type="submit" disabled={loading || banks.length === 0} className="h-11 rounded-xl bg-[var(--ochi-accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--ochi-surface-raised)] disabled:opacity-50 sm:col-span-2">
            {loading ? 'Saving…' : 'Save payout account'}
          </button>
        </form>
      ) : null}
    </section>
  );
}
