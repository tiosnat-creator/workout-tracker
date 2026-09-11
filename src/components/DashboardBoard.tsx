"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
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

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}

function CategoryHeader({ name }: { name: string }) {
  return (
    <h2 className="text-sm font-semibold text-muted uppercase">{name}</h2>
  );
}

function CategorySection({ group }: { group: CategoryGroup }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.category.id });

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
          <GripIcon />
        </button>
        <CategoryHeader name={group.category.name} />
      </div>
      {/* Same element regardless of isDragging — CategoryTileGrid holds its
          own reorder state via useOptimisticOrder, so branching into two
          different tree positions here would remount it (and lose any
          in-progress or just-saved tile order) every time a category drag
          starts or ends. Only the wrapper's visibility toggles; the actual
          dragged section renders in the DragOverlay below so it can float
          freely without fighting this element's own layout transform on
          drop (the same fix applied to individual tiles). */}
      <div className={isDragging ? "invisible" : undefined}>
        <CategoryTileGrid tiles={group.tiles} />
      </div>
    </section>
  );
}

export function DashboardBoard({ groups: initialGroups }: { groups: CategoryGroup[] }) {
  const { items: groups, reorder, saveError } = useOptimisticOrder(
    initialGroups,
    (group) => group.category.id,
    updateCategoryDashboardOrder,
  );
  const [activeGroup, setActiveGroup] = useState<CategoryGroup | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const group = groups.find((g) => g.category.id === event.active.id) ?? null;
    setActiveGroup(group);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGroup(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = groups.findIndex((g) => g.category.id === active.id);
    const newIndex = groups.findIndex((g) => g.category.id === over.id);
    reorder(arrayMove(groups, oldIndex, newIndex));
  }

  return (
    <div className="flex flex-col gap-2">
      {saveError && (
        <p className="text-xs text-red-600">
          Couldn&apos;t save the new category order — reverted. Try again.
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveGroup(null)}
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
        <DragOverlay>
          {activeGroup && (
            <div className="flex items-center gap-2 rounded border border-accent bg-surface px-3 py-2 shadow-lg">
              <span className="text-muted">
                <GripIcon />
              </span>
              <CategoryHeader name={activeGroup.category.name} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
