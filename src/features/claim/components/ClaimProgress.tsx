import { useEffect, useRef, useState } from 'react';
import logo from '@/assets/tosidrop_logo.png';
import type { ClaimScene, ClaimProgressStage } from './claimScene';

export type { ClaimProgressStage } from './claimScene';

const COPY: Record<ClaimProgressStage, { title: string; description: string }> = {
  signing: { title: 'Confirm in your wallet', description: 'Approve the deposit in your wallet to continue.' },
  confirmation: { title: 'Confirming your deposit', description: 'Deposit submitted. Waiting for confirmation on Cardano.' },
  delivery: { title: 'Delivering your rewards', description: 'Deposit received. TosiDrop is preparing your reward delivery.' },
  complete: { title: 'Rewards delivered', description: 'Your claim is complete.' },
};

export function ClaimProgress({ stage }: { stage: ClaimProgressStage }) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<ClaimScene | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [renderer, setRenderer] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const complete = stage === 'complete';
  // Stay still until the device preference has been read.
  const playing = reducedMotion === false && !complete;
  const currentState = useRef({ playing, stage });

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    currentState.current = { playing, stage };
    scene.current?.setState(currentState.current);
  }, [playing, stage]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let failed = false;
    const fail = () => {
      failed = true;
      if (!cancelled) {
        scene.current?.dispose();
        scene.current = null;
        setRenderer('fallback');
      }
    };
    void import('./claimScene')
      .then(({ createClaimScene }) => cancelled ? null : createClaimScene(element, logo, fail))
      .then((instance) => {
        if (!instance) return;
        if (cancelled || failed) { instance.dispose(); return; }
        scene.current = instance;
        instance.setState(currentState.current);
        setRenderer('ready');
      })
      .catch(fail);
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  return (
    <div className="relative" aria-label="Claim progress">
      <div
        ref={container}
        aria-hidden="true"
        data-testid="claim-artwork"
        data-renderer={renderer}
        className="relative h-48 w-full sm:h-56 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
      >
        {renderer !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={logo} alt="" className="h-12 w-12 object-contain" />
          </div>
        )}
      </div>
      {renderer === 'ready' && stage === 'signing' && (
        <p aria-hidden="true" className="absolute inset-x-0 bottom-0 text-center text-xs text-text-secondary">
          Approve in your wallet
        </p>
      )}
      <div role="status" aria-live="polite" aria-atomic="true" className={renderer === 'ready' ? 'sr-only' : 'rounded-lg bg-surface-base px-3 py-2 text-center'}>
        <h2 className="text-sm font-semibold text-text-primary">
          {COPY[stage].title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{COPY[stage].description}</p>
      </div>
    </div>
  );
}
