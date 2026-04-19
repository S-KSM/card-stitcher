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

  return (
    <div className="flip-stage w-full h-full grid place-items-center">
      <div className="relative max-w-[90vmin] max-h-[80vmin] aspect-[3/4] w-full">
        {current && (
          <img
            key={current}
            src={current}
            alt=""
            className="absolute inset-0 w-full h-full object-contain rounded-card shadow-2xl bg-black"
            draggable={false}
          />
        )}
        {outgoing && (
          <div
            key={outgoing.url + outgoing.direction}
            className={
              outgoing.direction === 'next' ? 'flip-out-next' : 'flip-out-prev'
            }
            onAnimationEnd={handleAnimationEnd}
          >
            <img
              src={outgoing.url}
              alt=""
              className="absolute inset-0 w-full h-full object-contain rounded-card shadow-2xl bg-black"
              draggable={false}
            />
            <div className="flip-shadow absolute inset-0 rounded-card pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
}
