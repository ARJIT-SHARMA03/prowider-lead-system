// src/lib/sse.ts
/**
 * Simple in-process SSE broadcaster.
 * Clients connect to /api/providers/stream and receive push events
 * whenever a new lead is assigned.
 */

type Listener = (data: string) => void;

const listeners = new Set<Listener>();

export function addSSEListener(fn: Listener) {
  listeners.add(fn);
}

export function removeSSEListener(fn: Listener) {
  listeners.delete(fn);
}

export function broadcastLeadUpdate(payload: object) {
  const data = JSON.stringify(payload);
  listeners.forEach((fn) => fn(data));
}
