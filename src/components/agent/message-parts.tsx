"use client";

import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { Loader2, Wrench } from "lucide-react";

function ToolCard({ part }: { part: ReturnType<typeof extractToolPart> }) {
  if (!part) return null;
  const name = part.name;
  const running =
    part.state === "input-streaming" || part.state === "input-available";
  const failed = part.state === "output-error";

  return (
    <details className="group my-1 rounded-md border border-hairline bg-panel/40 text-xs open:bg-panel/70">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-muted select-none">
        {running ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Wrench className="size-3.5 shrink-0" aria-hidden />
        )}
        <span className="font-mono">{name}</span>
        <span
          className={cn(
            "ml-auto rounded-sm px-1.5 py-0.5 font-mono text-[0.65rem] tracking-wide uppercase",
            failed
              ? "bg-danger/15 text-danger"
              : running
                ? "text-muted"
                : "bg-accent/10 text-accent",
          )}
        >
          {running ? "running" : failed ? "error" : "done"}
        </span>
      </summary>
      <div className="space-y-2 border-t border-hairline px-3 py-2 font-mono text-[0.7rem] break-all whitespace-pre-wrap text-muted">
        {"input" in part && part.input !== undefined ? (
          <div>
            <div className="mb-1 text-foreground/70">input</div>
            {JSON.stringify(part.input, null, 2)}
          </div>
        ) : null}
        {part.state === "output-available" ? (
          <div>
            <div className="mb-1 text-foreground/70">output</div>
            {JSON.stringify(part.output, null, 2)}
          </div>
        ) : null}
        {part.state === "output-error" ? (
          <div className="text-danger">{part.errorText}</div>
        ) : null}
      </div>
    </details>
  );
}

function extractToolPart(part: UIMessage["parts"][number]) {
  if (!isToolUIPart(part)) return null;
  return { name: getToolName(part), ...part };
}

/** Renders one UIMessage's parts: text inline, tool calls as collapsible cards. */
export function MessageParts({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <p
              key={i}
              className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90"
            >
              {part.text}
            </p>
          );
        }
        const toolPart = extractToolPart(part);
        if (toolPart) return <ToolCard key={i} part={toolPart} />;
        return null;
      })}
    </>
  );
}
