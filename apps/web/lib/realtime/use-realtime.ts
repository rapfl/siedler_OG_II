"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { getRealtimeClient } from "./local-client";
import type { MatchSnapshotState } from "./local-client";

const EMPTY_SNAPSHOT: MatchSnapshotState = {
  eventLog: [],
};

export function useRealtimeSnapshot() {
  const client = useMemo(() => getRealtimeClient(), []);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const snapshot = useSyncExternalStore(
    (listener) => {
      const unsubscribeRoom = client.subscribeRoom(listener);
      const unsubscribeMatch = client.subscribeMatch(listener);
      return () => {
        unsubscribeRoom();
        unsubscribeMatch();
      };
    },
    () => (hydrated ? client.getSnapshot() : EMPTY_SNAPSHOT),
    () => EMPTY_SNAPSHOT,
  );

  return {
    client,
    snapshot,
    session: hydrated ? client.getSession() : undefined,
  };
}
