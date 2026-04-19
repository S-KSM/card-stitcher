import { useEffect, useState, useRef } from 'react';
import { PageFlip } from './PageFlip';
import { ZoomPanLayer } from './ZoomPanLayer';
import { ViewerOverlay } from './ViewerOverlay';

interface Props {
  title: string;
  urls: string[];
  onBack: () => void;
  onExport: () => void;
}

export function CardViewer({ title, urls, onBack, onExport }: Props) {
  const [index, setIndex] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  const resetOverlayTimer = () => {
    setOverlayVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOverlayVisible(false), 2500);
  };

  useEffect(() => {
    resetOverlayTimer();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        (window as unknown as { __flipNext?: () => void }).__flipNext?.();
        resetOverlayTimer();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        (window as unknown as { __flipPrev?: () => void }).__flipPrev?.();
        resetOverlayTimer();
      } else if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const handleTapEdge = (edge: 'left' | 'right' | 'center') => {
    if (edge === 'right') {
      (window as unknown as { __flipNext?: () => void }).__flipNext?.();
    } else if (edge === 'left') {
      (window as unknown as { __flipPrev?: () => void }).__flipPrev?.();
    } else {
      setOverlayVisible((v) => !v);
    }
    resetOverlayTimer();
  };

  return (
    <div
      className="fixed inset-0 bg-bg-viewer overflow-hidden select-none"
      onMouseMove={resetOverlayTimer}
    >
      <ZoomPanLayer onTapEdge={handleTapEdge}>
        <PageFlip urls={urls} index={index} onIndexChange={setIndex} />
      </ZoomPanLayer>
      <ViewerOverlay
        title={title}
        index={index}
        total={urls.length}
        visible={overlayVisible}
        onBack={onBack}
        onPrev={() => {
          (window as unknown as { __flipPrev?: () => void }).__flipPrev?.();
          resetOverlayTimer();
        }}
        onNext={() => {
          (window as unknown as { __flipNext?: () => void }).__flipNext?.();
          resetOverlayTimer();
        }}
        onExport={onExport}
      />
    </div>
  );
}
