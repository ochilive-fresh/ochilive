import { useEffect } from 'react';

function SignUpPrompt({ action, onClose, onSignUp, onSignIn }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:px-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-prompt-title"
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[var(--ochi-surface)] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ochi-accent-light)]">Join Ochi Live</p>
            <h2 id="signup-prompt-title" className="mt-2 text-xl font-semibold text-white">Be part of the community</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 px-2.5 py-1 text-slate-400 transition hover:text-white" aria-label="Close">×</button>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Create an account to {action || 'interact with creators'}.
        </p>
        <button type="button" onClick={onSignUp} className="mt-5 w-full rounded-full bg-[var(--ochi-accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110">
          Create an account
        </button>
        <button type="button" onClick={onSignIn} className="mt-2 w-full rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.05]">
          I already have an account
        </button>
      </section>
    </div>
  );
}

export default SignUpPrompt;
