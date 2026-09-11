"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateCategoryDashboardOrder } from "@/lib/actions";
import { useOptimisticOrder } from "@/hooks/useOptimisticOrder";
import { CategoryTileGrid, type Tile } from "@/components/CategoryTileGrid";
import type { Category } from "@prisma/client";

export type CategoryGroup = {
  category: Category;
  tiles: Tile[];
};

function CategorySection({ group }: { group: CategoryGroup }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: group.category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <section ref={setNodeRef} style={style}>
      <div className="mb-2 flex items-center gap-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label="Drag to reorder category"
          className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted hover:bg-accent/10 hover:text-accent active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <circle cx="5" cy="3" r="1.3" />
            <circle cx="11" cy="3" r="1.3" />
            <circle cx="5" cy="8" r="1.3" />
            <circle cx="11" cy="8" r="1.3" />
            <circle cx="5" cy="13" r="1.3" />
            <circle cx="11" cy="13" r="1.3" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-muted uppercase">
          {group.category.name}
        </h2>
      </div>
      <CategoryTileGrid tiles={group.tiles} />
    </section>
  );
}

export function DashboardBoard({ groups: initialGroups }: { groups: CategoryGroup[] }) {
  const { items: groups, reorder } = useOptimisticOrder(
    initialGroups,
    (group) => group.category.id,
    updateCategoryDashboardOrder,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = groups.findIndex((g) => g.category.id === active.id);
    const newIndex = groups.findIndex((g) => g.category.id === over.id);
    reorder(arrayMove(groups, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={groups.map((g) => g.category.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <CategorySection key={group.category.id} group={group} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
