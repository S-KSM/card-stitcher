import { Sparkles, Wand2 } from 'lucide-react';
import { useEnhanceStore } from '../../store/useEnhanceStore';

interface Props {
  pageId: string;
  isEnhanced: boolean;
  onClick: () => void;
}

export function EnhanceButton({ pageId, isEnhanced, onClick }: Props) {
  const status = useEnhanceStore((s) => s.perPage[pageId]);
  const running = status?.kind === 'running';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={running}
      aria-label={isEnhanced ? 'Re-enhance page' : 'Enhance page'}
      className={[
        'absolute bottom-1 right-1 grid place-items-center w-6 h-6 rounded-full transition',
        running
          ? 'bg-accent-primary/70 text-white animate-pulse'
          : isEnhanced
            ? 'bg-accent-primary text-white'
            : 'bg-black/55 text-white hover:bg-accent-primary',
      ].join(' ')}
    >
      {isEnhanced ? <Sparkles size={14} /> : <Wand2 size={14} />}
    </button>
  );
}
