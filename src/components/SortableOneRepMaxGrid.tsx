"use client";

import { useRef, useState } from "react";
import Link from "next/link";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateLiftDashboardOrder } from "@/lib/actions";
import { categoryLabel, formatWeight } from "@/lib/format";
import type { Lift } from "@prisma/client";

type Tile = {
  lift: Lift;
  current: { weight: number } | null;
};

function TileContent({ tile }: { tile: Tile }) {
  const { lift, current } = tile;
  return (
    <>
      <p className="text-xs text-muted">{categoryLabel(lift.category)}</p>
      <p className="text-sm font-medium">{lift.name}</p>
      <p className="mt-1 text-lg font-bold">
        {current ? formatWeight(current.weight) : "—"}
      </p>
    </>
  );
}

function SortableTile({
  tile,
  wasDraggedRef,
}: {
  tile: Tile;
  wasDraggedRef: React.RefObject<boolean>;
}) {
  const { lift } = tile;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lift.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative rounded border border-border bg-surface p-3 touch-none"
      {...attributes}
      {...listeners}
    >
      {isDragging ? (
        // Placeholder left behind in the grid; the actual dragged tile
        // renders in the DragOverlay below so it can float freely without
        // fighting this element's own layout transform on drop.
        <div className="invisible">
          <TileContent tile={tile} />
        </div>
      ) : (
        <Link
          href={`/lifts/${lift.id}`}
          onClick={(e) => {
            if (wasDraggedRef.current) {
              e.preventDefault();
              wasDraggedRef.current = false;
            }
          }}
          className="block"
          draggable={false}
        >
          <TileContent tile={tile} />
        </Link>
      )}
    </div>
  );
}

export function SortableOneRepMaxGrid({ tiles }: { tiles: Tile[] }) {
  const [items, setItems] = useState(tiles);
  const [activeTile, setActiveTile] = useState<Tile | null>(null);
  const wasDraggedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    wasDraggedRef.current = true;
    const tile = items.find((t) => t.lift.id === event.active.id) ?? null;
    setActiveTile(tile);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveTile(null);
    // A click's own "click" event fires right after this and is caught by
    // wasDraggedRef there; fall back to clearing it here too, since a
    // keyboard-completed drag never fires a click to reset it.
    setTimeout(() => {
      wasDraggedRef.current = false;
    }, 0);

    if (!over || active.id === over.id) return;

    setItems((current) => {
      const oldIndex = current.findIndex((t) => t.lift.id === active.id);
      const newIndex = current.findIndex((t) => t.lift.id === over.id);
      const next = arrayMove(current, oldIndex, newIndex);
      updateLiftDashboardOrder(next.map((t) => t.lift.id)).catch(() => {});
      return next;
    });
  }

  function handleDragCancel() {
    setActiveTile(null);
    setTimeout(() => {
      wasDraggedRef.current = false;
    }, 0);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={items.map((t) => t.lift.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((tile) => (
            <SortableTile
              key={tile.lift.id}
              tile={tile}
              wasDraggedRef={wasDraggedRef}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeTile && (
          <div className="rounded border border-accent bg-surface p-3 shadow-lg">
            <TileContent tile={activeTile} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
