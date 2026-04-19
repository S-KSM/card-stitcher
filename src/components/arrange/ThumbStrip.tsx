import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { SortablePage } from './SortablePage';

interface Props {
  order: string[];
  urls: Record<string, string>;
  onReorder: (next: string[]) => void;
  onRemove: (id: string) => void;
}

function labelsFor(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return ['Front'];
  if (count === 2) return ['Front', 'Back'];
  if (count === 3) return ['Front', 'Inside', 'Back'];
  if (count === 4) return ['Front', 'Inside L', 'Inside R', 'Back'];
  const out = ['Front'];
  for (let i = 1; i < count - 1; i += 1) out.push(`Inside ${i}`);
  out.push('Back');
  return out;
}

export function ThumbStrip({ order, urls, onReorder, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const labels = labelsFor(order.length);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(order, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={order} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {order.map((id, idx) => (
            <div key={id} className="flex flex-col gap-1.5 shrink-0 w-[120px]">
              <SortablePage
                id={id}
                index={idx}
                src={urls[id]}
                onRemove={() => onRemove(id)}
              />
              <div className="text-[11px] text-ink-muted text-center px-2 py-1 rounded-full bg-border-subtle/50 truncate">
                {labels[idx]}
              </div>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
