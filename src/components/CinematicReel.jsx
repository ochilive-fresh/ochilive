import React from 'react';
import { useLottie } from 'lottie-react';
import animationData from '../assets/animations/streaming-animation.json';

export default function CinematicReel({ className = '' }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const options = {
    animationData,
    loop: !reduced,
    autoplay: !reduced,
    rendererSettings: { preserveAspectRatio: 'xMidYMid slice' },
  };
  const { View } = useLottie(options);

  if (reduced) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-slate-950/95 ${className}`} aria-hidden>
        <div className="aspect-[16/7] w-full flex items-center justify-center">
          <div className="text-sm text-slate-500">Live preview (reduced motion)</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-950/95 ${className}`} aria-label="Cinematic preview of live shows" role="img">
      <div className="aspect-[16/7] w-full">{View}</div>
    </div>
  );
}
