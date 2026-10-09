import type { DemoTrace } from "./sample-data";

export type GatewayEvent =
  | { type: "text"; content: string }
  | { type: "meta"; trace: DemoTrace }
  | { type: "error"; message: string }
  | { type: "done" };

function parseBlock(block: string): GatewayEvent | null {
  let eventName = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  const payload = data.join("\n");
  if (!payload) return null;
  if (payload === "[DONE]") return { type: "done" };
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object") return null;
    if (eventName === "gateway-meta") return { type: "meta", trace: parsed as DemoTrace };
    if (eventName === "error") {
      const message = (parsed as { message?: unknown }).message;
      return { type: "error", message: typeof message === "string" ? message : "The response was interrupted." };
    }
    const content = (parsed as { choices?: { delta?: { content?: unknown } }[] }).choices?.[0]?.delta?.content;
    return typeof content === "string" ? { type: "text", content } : null;
  } catch {
    return null;
  }
}

export async function readGatewayStream(stream: ReadableStream<Uint8Array>, onEvent: (event: GatewayEvent) => void): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replaceAll("\r\n", "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) >= 0) {
        const event = parseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (event) onEvent(event);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const event = parseBlock(buffer);
      if (event) onEvent(event);
    }
  } finally {
    reader.releaseLock();
  }
}
