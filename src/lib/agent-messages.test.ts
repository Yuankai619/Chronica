import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import {
  estimateMessageTokens,
  toStoredRow,
  toUIMessage,
  truncateToTokenBudget,
} from "./agent-messages";

function textMessage(
  id: string,
  text: string,
  role: UIMessage["role"] = "user",
): UIMessage {
  return { id, role, parts: [{ type: "text", text }] };
}

describe("toUIMessage / toStoredRow", () => {
  it("round-trips a stored row through a UIMessage", () => {
    const row = {
      id: "m1",
      role: "assistant" as const,
      parts: [{ type: "text", text: "hello" }],
      created_at: "2026-08-17T00:00:00Z",
    };
    const message = toUIMessage(row);
    expect(message).toEqual({
      id: "m1",
      role: "assistant",
      parts: [{ type: "text", text: "hello" }],
    });
    expect(toStoredRow(message)).toEqual({
      id: "m1",
      role: "assistant",
      parts: [{ type: "text", text: "hello" }],
    });
  });

  it("defaults missing parts to an empty array", () => {
    const message = toUIMessage({
      id: "m2",
      role: "user",
      parts: null as unknown as never,
      created_at: "",
    });
    expect(message.parts).toEqual([]);
  });
});

describe("estimateMessageTokens", () => {
  it("estimates roughly 4 characters per token", () => {
    expect(estimateMessageTokens(textMessage("m", "a".repeat(40)))).toBe(10);
  });
});

describe("truncateToTokenBudget", () => {
  it("keeps everything under budget untouched", () => {
    const messages = [
      textMessage("1", "short"),
      textMessage("2", "also short"),
    ];
    const result = truncateToTokenBudget(messages, 1000);
    expect(result).toEqual({ messages, droppedCount: 0 });
  });

  it("drops the oldest messages and prepends a truncation note", () => {
    const messages = [
      textMessage("1", "a".repeat(400)),
      textMessage("2", "b".repeat(400)),
      textMessage("3", "c".repeat(40)),
    ];
    // Budget only fits the last message (~10 tokens) plus a little slack.
    const result = truncateToTokenBudget(messages, 15);

    expect(result.droppedCount).toBe(2);
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[0].id).toBe("truncation-note");
    expect(result.messages.at(-1)).toEqual(messages.at(-1));
  });

  it("never drops the single most recent message even if it alone exceeds budget", () => {
    const messages = [textMessage("1", "x".repeat(4000))];
    const result = truncateToTokenBudget(messages, 1);
    expect(result.droppedCount).toBe(0);
    expect(result.messages).toEqual(messages);
  });
});
