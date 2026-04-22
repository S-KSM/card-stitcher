import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import { EnhanceButton } from '../enhance/EnhanceButton';

interface Props {
  id: string;
  index: number;
  src: string;
  isEnhanced: boolean;
  onRemove: () => void;
  onEnhance: () => void;
}

export function SortablePage({ id, index, src, isEnhanced, onRemove, onEnhance }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative shrink-0 w-[120px] h-[160px] rounded-card overflow-hidden bg-surface-card border border-border-subtle shadow-sm"
    >
      <img src={src} alt="" className="w-full h-full object-cover pointer-events-none" />
      <div className="absolute top-1 left-1 bg-black/55 text-white text-[11px] px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
      <button
        onClick={onRemove}
        aria-label="Remove page"
        className="absolute top-1 right-1 bg-black/55 hover:bg-red-600 text-white rounded-full w-6 h-6 grid place-items-center transition"
      >
        <X size={14} />
      </button>
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute bottom-1 left-1 bg-black/55 text-white rounded w-6 h-6 grid place-items-center cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={14} />
      </button>
      <EnhanceButton pageId={id} isEnhanced={isEnhanced} onClick={onEnhance} />
    </div>
  );
}
