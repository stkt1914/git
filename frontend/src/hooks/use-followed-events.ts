"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import { DEFAULT_FOLLOWED_EVENT_IDS } from "@/data/demo-events";

const STORAGE_KEY = "zhilan-followed-events-v1";
const STORAGE_EVENT = "zhilan-followed-events-change";
const DEFAULT_SERIALIZED = JSON.stringify(DEFAULT_FOLLOWED_EVENT_IDS);

let memorySnapshot: string | null = null;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function getSnapshot() {
  if (memorySnapshot !== null) {
    return memorySnapshot;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SERIALIZED;
  } catch {
    return DEFAULT_SERIALIZED;
  }
}

function getServerSnapshot() {
  return DEFAULT_SERIALIZED;
}

export function useFollowedEvents() {
  const serializedIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const followedIds = useMemo(
    () => parseFollowedIds(serializedIds),
    [serializedIds],
  );

  const toggleFollow = useCallback((eventId: string) => {
    const current = parseFollowedIds(getSnapshot());
    const next = current.includes(eventId)
      ? current.filter((id) => id !== eventId)
      : [...current, eventId];
    const nextSerialized = JSON.stringify(next);

    memorySnapshot = nextSerialized;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextSerialized);
    } catch {
      // Keep the in-memory value when storage is blocked.
    }
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, []);

  return {
    followedIds,
    toggleFollow,
  };
}

function parseFollowedIds(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Fall back to the default demonstration watchlist.
  }

  return DEFAULT_FOLLOWED_EVENT_IDS;
}
