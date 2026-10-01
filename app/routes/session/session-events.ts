import type { Route } from "./+types/session-events";
import { subscribeToSessionEvents, type SessionEvent } from "~/services/sessions.server";

export function loader({ request }: Route.LoaderArgs) {
  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let unsubscribe = () => {};
      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        request.signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        try { controller.close(); } catch { /* transport may already be closed */ }
      };
      dispose = cleanup;
      function send(event: string, value: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`));
        } catch {
          // A disconnected browser is normal. Remove its subscription instead
          // of retaining one dead listener per navigation/refresh indefinitely.
          cleanup();
        }
      }
      if (request.signal.aborted) { abort(); return; }
      request.signal.addEventListener("abort", abort, { once: true });
      send("ping", { start: Date.now() });
      unsubscribe = subscribeToSessionEvents((event: SessionEvent) => send("session_event", event));
      // subscribe immediately sends the snapshot; it can synchronously discover
      // a closed connection before `unsubscribe` has been assigned.
      if (closed) unsubscribe();
    },
    cancel() { dispose(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive", "X-Accel-Buffering": "no",
  } });
}
