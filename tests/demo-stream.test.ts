import assert from "node:assert/strict";
import test from "node:test";
import { readGatewayStream, type GatewayEvent } from "../src/lib/demo/read-stream";

test("public playground reads fragmented text, metadata, and completion events", async () => {
  const payload = [
    'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
    'event: gateway-meta\ndata: {"requestId":"abc","model":"gemini-2.5-flash"}\n\n',
    'data: [DONE]\n\n',
  ].join("");
  const bytes = new TextEncoder().encode(payload);
  const cuts = [3, 11, 29, 41, 78, 101, bytes.length];
  let previous = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const cut of cuts) {
        controller.enqueue(bytes.slice(previous, cut));
        previous = cut;
      }
      controller.close();
    },
  });
  const events: GatewayEvent[] = [];
  await readGatewayStream(stream, (event) => events.push(event));
  assert.deepEqual(events.map((event) => event.type), ["text", "text", "meta", "done"]);
  assert.equal(events.filter((event) => event.type === "text").map((event) => event.content).join(""), "Hello world");
  assert.equal(events[2].type === "meta" && events[2].trace.model, "gemini-2.5-flash");
});
