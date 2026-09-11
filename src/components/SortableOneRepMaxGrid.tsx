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
import { formatWeight } from "@/lib/format";
import type { Category, Lift } from "@prisma/client";

type Tile = {
  lift: Lift & { category: Category };
  current: { weight: number } | null;
};

function TileContent({ tile }: { tile: Tile }) {
  const { lift, current } = tile;
  return (
    <>
      <p className="text-xs text-muted">{lift.category.name}</p>
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
    setActivatorNodeRef,
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
      className="relative rounded border border-border bg-surface p-3 pr-7 touch-none"
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label="Drag to reorder"
        className="absolute right-1 top-1 flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted hover:bg-accent/10 hover:text-accent active:cursor-grabbing"
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
  const [saveError, setSaveError] = useState(false);
  const wasDraggedRef = useRef(false);
  const saveSeqRef = useRef(0);
  // The last order actually confirmed persisted — as opposed to each drag's
  // own local "previous" snapshot, which may itself never have been saved
  // if an earlier save in the same chain also failed. Tracked alongside the
  // seq that produced it, since saves can resolve out of request order.
  const lastConfirmedRef = useRef(tiles);
  const lastConfirmedSeqRef = useRef(0);
  // The seq of whatever order `items` currently shows, so a save that
  // resolves out of order — success or failure — can tell whether its
  // result is newer than what's on screen right now.
  const displayedSeqRef = useRef(0);

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

    const previous = items;
    const oldIndex = previous.findIndex((t) => t.lift.id === active.id);
    const newIndex = previous.findIndex((t) => t.lift.id === over.id);
    const next = arrayMove(previous, oldIndex, newIndex);

    const mySeq = ++saveSeqRef.current;
    setItems(next);
    displayedSeqRef.current = mySeq;
    setSaveError(false);

    updateLiftDashboardOrder(next.map((t) => t.lift.id))
      .then(() => {
        // Saves can resolve out of request order. Only accept this result
        // as the new revert-floor if it's for a later drag than whatever is
        // already recorded — otherwise an older save resolving last would
        // clobber a newer save's already-recorded, still-accurate result.
        if (mySeq > lastConfirmedSeqRef.current) {
          lastConfirmedSeqRef.current = mySeq;
          lastConfirmedRef.current = next;
        }
        // A late-arriving success can land after an in-between drag's own
        // failure already reverted the visible grid to a stale order —
        // sync it forward if this confirmed result is newer than what's
        // currently shown.
        if (mySeq > displayedSeqRef.current) {
          setItems(next);
          displayedSeqRef.current = mySeq;
          setSaveError(false);
        }
      })
      .catch(() => {
        // Only revert if nothing newer is currently on screen — an older
        // save failing after a newer one already displayed (successfully
        // or not) shouldn't clobber it.
        if (mySeq !== displayedSeqRef.current) return;
        // Revert to the last order actually confirmed persisted, not to
        // `previous` — if an earlier save in this chain also failed,
        // `previous` was never saved either and reverting to it would show
        // an order the database never held.
        setItems(lastConfirmedRef.current);
        displayedSeqRef.current = lastConfirmedSeqRef.current;
        setSaveError(true);
      });
  }

  function handleDragCancel() {
    setActiveTile(null);
    setTimeout(() => {
      wasDraggedRef.current = false;
    }, 0);
  }

  return (
    <div className="flex flex-col gap-2">
      {saveError && (
        <p className="text-xs text-red-600">
          Couldn&apos;t save the new order — reverted. Try again.
        </p>
      )}
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
    </div>
  );
}
