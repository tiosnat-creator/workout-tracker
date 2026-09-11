"use client";

import { useRef, useState } from "react";

/**
 * Optimistic drag-reorder state for a list persisted via a server action,
 * hardened against saves resolving out of request order (see the git log
 * for src/components/SortableOneRepMaxGrid.tsx for the incidents this
 * fixes — two overlapping drags whose network round-trips can settle in
 * either order).
 *
 * - `displayedSeqRef` tracks which save's order `items` currently reflects,
 *   so both success and failure handlers can tell whether their result is
 *   newer than what's on screen before touching it.
 * - `lastConfirmedRef`/`lastConfirmedSeqRef` track the newest order actually
 *   known to be persisted, used as the revert target on failure — never a
 *   drag's own local "previous" snapshot, which may itself never have been
 *   saved if an earlier save in the same chain also failed.
 */
export function useOptimisticOrder<T>(
  initialItems: T[],
  getId: (item: T) => string,
  persist: (orderedIds: string[]) => Promise<void>,
) {
  const [items, setItemsState] = useState(initialItems);
  const [saveError, setSaveError] = useState(false);

  const saveSeqRef = useRef(0);
  const lastConfirmedRef = useRef(initialItems);
  const lastConfirmedSeqRef = useRef(0);
  const displayedSeqRef = useRef(0);

  function reorder(next: T[]) {
    const mySeq = ++saveSeqRef.current;
    setItemsState(next);
    displayedSeqRef.current = mySeq;
    setSaveError(false);

    persist(next.map(getId))
      .then(() => {
        if (mySeq > lastConfirmedSeqRef.current) {
          lastConfirmedSeqRef.current = mySeq;
          lastConfirmedRef.current = next;
        }
        // A late-arriving success can land after an in-between save's own
        // failure already reverted the visible list — sync it forward if
        // this confirmed result is newer than what's currently shown.
        if (mySeq > displayedSeqRef.current) {
          setItemsState(next);
          displayedSeqRef.current = mySeq;
          setSaveError(false);
        }
      })
      .catch(() => {
        // Only revert if nothing newer is currently on screen.
        if (mySeq !== displayedSeqRef.current) return;
        setItemsState(lastConfirmedRef.current);
        displayedSeqRef.current = lastConfirmedSeqRef.current;
        setSaveError(true);
      });
  }

  return { items, reorder, saveError };
}
