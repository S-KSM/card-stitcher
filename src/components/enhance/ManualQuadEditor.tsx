import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Quad } from '../../lib/enhance/types';

interface Props {
  imageUrl: string;
  imageSize: { width: number; height: number };
  initial: Quad;
  onChange: (q: Quad) => void;
}

const HANDLE_RADIUS = 14;

export function ManualQuadEditor({ imageUrl, imageSize, initial, onChange }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [quad, setQuad] = useState<Quad>(initial);
  const [dragging, setDragging] = useState<number | null>(null);
  const [display, setDisplay] = useState({ width: 0, height: 0 });

  useEffect(() => setQuad(initial), [initial]);

  useEffect(() => {
    const update = () => {
      if (!wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      setDisplay({ width: rect.width, height: rect.height });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const sx = display.width / imageSize.width || 1;
  const sy = display.height / imageSize.height || 1;

  const toDisplay = (p: { x: number; y: number }) => ({ x: p.x * sx, y: p.y * sy });

  const onDown = (idx: number) => (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(idx);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging === null) return;
    const rect = wrapperRef.current!.getBoundingClientRect();
    const rx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ry = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const next: Quad = [...quad] as Quad;
    next[dragging] = { x: rx / sx, y: ry / sy };
    setQuad(next);
    onChange(next);
  };

  const onUp = () => setDragging(null);

  const polyPoints = quad.map((p) => {
    const d = toDisplay(p);
    return `${d.x},${d.y}`;
  }).join(' ');

  return (
    <div
      ref={wrapperRef}
      className="relative w-full bg-black rounded-card overflow-hidden select-none touch-none"
      style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}` }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
      {display.width > 0 && (
        <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${display.width} ${display.height}`}>
          <polygon
            points={polyPoints}
            fill="rgba(194,96,58,0.18)"
            stroke="#C2603A"
            strokeWidth={2}
          />
          {quad.map((p, i) => {
            const d = toDisplay(p);
            return (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={HANDLE_RADIUS}
                fill="#FFFFFF"
                stroke="#C2603A"
                strokeWidth={3}
                style={{ cursor: 'grab', pointerEvents: 'auto' }}
                onPointerDown={onDown(i)}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
