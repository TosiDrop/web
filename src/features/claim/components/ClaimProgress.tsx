import { useEffect, useRef, useState } from 'react';
import { IconCheck, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import logo from '@/assets/tosidrop_logo.png';
import type { ClaimScene } from './claimScene';

export type ClaimProgressStage = 'preparing' | 'signing' | 'confirmation' | 'delivery' | 'complete';

const COPY: Record<ClaimProgressStage, { title: string; description: string }> = {
  preparing: { title: 'Preparing your claim', description: 'Creating your deposit request.' },
  signing: { title: 'Confirm in your wallet', description: 'Approve the deposit in your wallet to continue.' },
  confirmation: { title: 'Confirming your deposit', description: 'Deposit submitted. Waiting for confirmation on Cardano.' },
  delivery: { title: 'Delivering your rewards', description: 'Deposit received. TosiDrop is preparing your reward delivery.' },
  complete: { title: 'Rewards delivered', description: 'Your claim is complete.' },
};

export function ClaimProgress({ stage }: { stage: ClaimProgressStage }) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<ClaimScene | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const [renderer, setRenderer] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const complete = stage === 'complete';
  // Stay still until the device preference has been read.
  const playing = reducedMotion === false && !paused && !complete;
  const currentState = useRef({ playing, complete });

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    currentState.current = { playing, complete };
    scene.current?.setState(currentState.current);
  }, [playing, complete]);

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
    <Card className="relative overflow-hidden px-5 pb-6 sm:px-6">
      <div
        ref={container}
        aria-hidden="true"
        data-testid="claim-artwork"
        data-renderer={renderer}
        className="relative mx-auto h-64 w-full max-w-md sm:h-72 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
      >
        {renderer !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={logo} alt="" className="h-24 w-24 object-contain" />
          </div>
        )}
      </div>
      {renderer === 'ready' && !reducedMotion && !complete && (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? 'Play animation' : 'Pause animation'}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {paused ? <IconPlayerPlay size={16} aria-hidden /> : <IconPlayerPause size={16} aria-hidden />}
        </button>
      )}
      <div role="status" aria-live="polite" aria-atomic="true" className="mx-auto max-w-sm text-center">
        <h2 className="flex items-center justify-center gap-2 text-lg font-semibold text-text-primary">
          {complete && <IconCheck size={20} className="text-accent" aria-hidden />}
          {COPY[stage].title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{COPY[stage].description}</p>
      </div>
    </Card>
  );
}
