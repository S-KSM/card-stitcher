import { useRef, useState, type PointerEvent, type WheelEvent, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onTapEdge?: (edge: 'left' | 'right' | 'center') => void;
}

const MAX_ZOOM = 4;
const MIN_ZOOM = 1;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

export function ZoomPanLayer({ children, onTapEdge }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const tapStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef(0);

  const clampPan = (scale: number, x: number, y: number) => {
    const el = containerRef.current;
    if (!el) return { x, y };
    const bounds = el.getBoundingClientRect();
    const limitX = ((scale - 1) * bounds.width) / 2;
    const limitY = ((scale - 1) * bounds.height) / 2;
    return {
      x: Math.max(-limitX, Math.min(limitX, x)),
      y: Math.max(-limitY, Math.min(limitY, y)),
    };
  };

  const reset = () => setT({ scale: 1, x: 0, y: 0 });

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStart.current = { dist, scale: t.scale };
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      panStart.current = { px: e.clientX, py: e.clientY, ox: t.x, oy: t.y };
      tapStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = dist / pinchStart.current.dist;
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStart.current.scale * ratio));
      const clamped = clampPan(nextScale, t.x, t.y);
      setT({ scale: nextScale, x: clamped.x, y: clamped.y });
    } else if (pointers.current.size === 1 && panStart.current && t.scale > 1) {
      const dx = e.clientX - panStart.current.px;
      const dy = e.clientY - panStart.current.py;
      const clamped = clampPan(t.scale, panStart.current.ox + dx, panStart.current.oy + dy);
      setT((prev) => ({ ...prev, x: clamped.x, y: clamped.y }));
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const wasPinch = pointers.current.size === 2;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) panStart.current = null;

    if (wasPinch) return;
    const start = tapStart.current;
    tapStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Date.now() - start.t;
    if (Math.hypot(dx, dy) > 12 || dt > 450) return;
    // Tap detected
    const now = Date.now();
    if (now - lastTap.current < 320) {
      // Double tap zoom toggle
      if (t.scale > 1) reset();
      else setT({ scale: 2, x: 0, y: 0 });
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;

    if (t.scale === 1 && onTapEdge) {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const rel = (e.clientX - r.left) / r.width;
      if (rel < 0.3) onTapEdge('left');
      else if (rel > 0.7) onTapEdge('right');
      else onTapEdge('center');
    }
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, t.scale + delta));
    const clamped = clampPan(nextScale, t.x, t.y);
    setT({ scale: nextScale, x: clamped.x, y: clamped.y });
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (t.scale > 1) reset();
        else setT({ scale: 2, x: 0, y: 0 });
      }}
    >
      <div
        className="absolute inset-0 grid place-items-center"
        style={{
          transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`,
          transformOrigin: 'center center',
          transition: pointers.current.size === 0 ? 'transform 180ms ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
