import { useEffect, useRef, useState, type AnimationEvent } from 'react';

interface Props {
  urls: string[];
  index: number;
  onIndexChange: (next: number) => void;
}

type Direction = 'next' | 'prev';
interface Outgoing {
  url: string;
  direction: Direction;
}

declare global {
  interface Window {
    __flipNext?: () => void;
    __flipPrev?: () => void;
  }
}

export function PageFlip({ urls, index, onIndexChange }: Props) {
  const [outgoing, setOutgoing] = useState<Outgoing | null>(null);
  const lock = useRef(false);

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= urls.length) return;
    if (lock.current) return;
    const currentUrl = urls[index];
    if (!currentUrl) {
      onIndexChange(nextIndex);
      return;
    }
    lock.current = true;
    setOutgoing({
      url: currentUrl,
      direction: nextIndex > index ? 'next' : 'prev',
    });
    onIndexChange(nextIndex);
  };

  useEffect(() => {
    window.__flipNext = () => goTo(index + 1);
    window.__flipPrev = () => goTo(index - 1);
    return () => {
      delete window.__flipNext;
      delete window.__flipPrev;
    };
  });

  const handleAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (!e.animationName.startsWith('cs-flip-out-')) return;
    setOutgoing(null);
    lock.current = false;
  };

  const current = urls[index];
  const hasPrev = index > 0;
  const hasNext = index < urls.length - 1;

  return (
    <div className="flip-stage w-full h-full grid place-items-center">
      <div className="card-binding relative max-w-[90vmin] max-h-[80vmin] aspect-[3/4] w-full">
        {/* Stack of pages beneath — gives the bound feel */}
        <div aria-hidden className="card-stack" />

        {/* Current page (revealed beneath the flipping one) */}
        {current && (
          <div className="card-face">
            <img
              key={current}
              src={current}
              alt=""
              className="card-image"
              draggable={false}
            />
            {/* Spine shadow on the left edge — always present on the active page */}
            <div aria-hidden className="spine-shadow" />
            {/* Curl shadow sweeps across while a page is flipping over this one */}
            {outgoing && outgoing.direction === 'next' && (
              <div aria-hidden className="curl-sweep curl-sweep-next" />
            )}
            {outgoing && outgoing.direction === 'prev' && (
              <div aria-hidden className="curl-sweep curl-sweep-prev" />
            )}
          </div>
        )}

        {/* Flipping page — two-sided (front = old image, back = card paper) */}
        {outgoing && (
          <div
            key={outgoing.url + outgoing.direction}
            className={
              outgoing.direction === 'next' ? 'flip-out-next' : 'flip-out-prev'
            }
            onAnimationEnd={handleAnimationEnd}
          >
            <div className="flip-face flip-face-front">
              <img
                src={outgoing.url}
                alt=""
                className="card-image"
                draggable={false}
              />
              <div aria-hidden className="flip-front-shade" />
            </div>
            <div className="flip-face flip-face-back" aria-hidden>
              <div className="flip-back-paper" />
            </div>
          </div>
        )}

        {/* Edge hints — faint page edges on the binding side show more pages */}
        {hasNext && <div aria-hidden className="edge-hint edge-hint-right" />}
        {hasPrev && <div aria-hidden className="edge-hint edge-hint-left" />}
      </div>
    </div>
  );
}
