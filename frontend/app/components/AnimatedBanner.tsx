'use client';

import { useCallback, useEffect, useRef, ReactElement } from 'react';
import { gsap } from 'gsap';

type BannerIntent = 'success' | 'error' | 'info' | 'warning';

type AnimatedBannerProps = {
  message: string;
  intent?: BannerIntent;
  onDismiss?: () => void;
  autoClose?: boolean;
  closeDelay?: number;
};

const intentStyles: Record<BannerIntent, string> = {
  success:
    'border-emerald-400/40 bg-emerald-500/15 text-emerald-100 shadow-emerald-500/20',
  error: 'border-red-400/40 bg-red-500/15 text-red-100 shadow-red-500/20',
  info: 'border-purple-400/40 bg-purple-500/15 text-purple-100 shadow-purple-500/20',
  warning: 'border-amber-400/40 bg-amber-500/15 text-amber-100 shadow-amber-500/20',
};

const intentIcons: Record<BannerIntent, ReactElement> = {
  success: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-7.071 7.071a1 1 0 01-1.414 0L3.293 8.85a1 1 0 011.414-1.414l3.221 3.221 6.364-6.364a1 1 0 011.415 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-11.536a1 1 0 00-1.414-1.414L10 7.172 7.879 5.05a1 1 0 00-1.414 1.414L8.586 8.586 6.465 10.707a1 1 0 101.414 1.414L10 10l2.121 2.121a1 1 0 001.414-1.414L11.414 8.586l2.122-2.122z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm9-4a1 1 0 10-2 0 1 1 0 002 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 000-2v-3a1 1 0 00-1-1H9z" />
    </svg>
  ),
  warning: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.604c.75 1.335-.213 3.006-1.742 3.006H3.48c-1.53 0-2.492-1.67-1.742-3.006L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v3a1 1 0 01-1 1z" />
    </svg>
  ),
};

const AnimatedBanner = ({
  message,
  intent = 'info',
  onDismiss,
  autoClose = true,
  closeDelay = 3,
}: AnimatedBannerProps) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    const target = bannerRef.current;
    if (!target) {
      onDismiss?.();
      return;
    }

    gsap.to(target, {
      y: -16,
      autoAlpha: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        closingRef.current = false;
        onDismiss?.();
      },
    });
  }, [onDismiss]);

  useEffect(() => {
    const target = bannerRef.current;
    if (!target) return;

    closingRef.current = false;
    gsap.set(target, { y: -12, autoAlpha: 0, scale: 0.96 });
    gsap.to(target, {
      y: 0,
      autoAlpha: 1,
      scale: 1,
      duration: 0.35,
      ease: 'power3.out',
    });

    const delayed = autoClose ? gsap.delayedCall(closeDelay, handleClose) : null;

    return () => {
      delayed?.kill();
      gsap.killTweensOf(target);
    };
  }, [autoClose, closeDelay, handleClose, message]);

  return (
    <div
      ref={bannerRef}
      className={`relative flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl ${intentStyles[intent]}`}
    >
      <span className="mt-0.5 shrink-0">{intentIcons[intent]}</span>
      <p className="flex-1 text-left leading-snug">{message}</p>
      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        className="ml-4 text-xs uppercase tracking-wide text-current/70 transition hover:text-current"
      >
        Close
      </button>
    </div>
  );
};

export default AnimatedBanner;




