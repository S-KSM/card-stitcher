import { ArrowLeft, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';

interface Props {
  title: string;
  index: number;
  total: number;
  visible: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onExport: () => void;
}

export function ViewerOverlay({
  title,
  index,
  total,
  visible,
  onBack,
  onPrev,
  onNext,
  onExport,
}: Props) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/55 to-transparent p-4 flex items-center gap-3 pointer-events-auto">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-white text-[20px] truncate">
          {title || 'Untitled card'}
        </h1>
        <button
          onClick={onExport}
          className="ml-auto p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Export"
        >
          <Share2 size={18} />
        </button>
      </div>

      <button
        onClick={onPrev}
        disabled={index <= 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center disabled:opacity-25 pointer-events-auto"
        aria-label="Previous page"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={onNext}
        disabled={index >= total - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center disabled:opacity-25 pointer-events-auto"
        aria-label="Next page"
      >
        <ChevronRight size={22} />
      </button>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-auto">
        <div className="bg-black/50 text-white text-[13px] px-3 py-1.5 rounded-full tabular-nums">
          {Math.min(index + 1, total)} / {total}
        </div>
      </div>
    </div>
  );
}
