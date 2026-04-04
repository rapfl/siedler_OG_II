"use client";

import { useMemo, useSyncExternalStore } from "react";

import { getRealtimeClient } from "./local-client";

export function useRealtimeSnapshot() {
  const client = useMemo(() => getRealtimeClient(), []);

  const snapshot = useSyncExternalStore(
    (listener) => {
      const unsubscribeRoom = client.subscribeRoom(listener);
      const unsubscribeMatch = client.subscribeMatch(listener);
      return () => {
        unsubscribeRoom();
        unsubscribeMatch();
      };
    },
    () => client.getSnapshot(),
    () => client.getSnapshot(),
  );

  return {
    client,
    snapshot,
    session: client.getSession(),
  };
}
