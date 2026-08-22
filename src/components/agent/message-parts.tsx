"use client";

import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { Brain, Calendar, Check, Loader2, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/agent/markdown";

type ToolPart = ReturnType<typeof extractToolPart>;

const MEMORY_TOOL_NAMES = new Set(["upsertMemory", "deleteMemory"]);

interface PlanItem {
  day: string;
  categoryId: string;
  expectedMinutes: number;
  title?: string;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function PlanApprovalCard({
  part,
  onRespond,
}: {
  part: NonNullable<ToolPart>;
  onRespond?: (approved: boolean) => void;
}) {
  const input = part.input as
    { weekStart?: string; items?: PlanItem[] } | undefined;
  const items = input?.items ?? [];
  const responded =
    part.state === "approval-responded" || part.state === "output-available";
  const approved =
    part.state === "approval-responded" ? part.approval.approved : undefined;

  return (
    <div className="my-1 rounded-md border border-accent/30 bg-accent/5 p-3 text-xs">
      <div className="mb-2 flex items-center gap-2 text-foreground/80">
        <Calendar className="size-3.5 shrink-0 text-accent" aria-hidden />
        <span>
          Proposed plan for week of{" "}
          <span className="font-mono">{input?.weekStart}</span>
        </span>
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded bg-panel/60 px-2 py-1"
          >
            <span className="font-mono text-muted">{item.day}</span>
            <span className="truncate text-foreground/90">
              {item.title ?? item.categoryId}
            </span>
            <span className="ml-auto shrink-0 font-mono tabular-nums text-muted">
              {formatMinutes(item.expectedMinutes)}
            </span>
          </div>
        ))}
      </div>
      {part.state === "approval-requested" && onRespond ? (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onRespond(false)}>
            <X className="size-3.5" aria-hidden />
            Reject
          </Button>
          <Button size="sm" onClick={() => onRespond(true)}>
            <Check className="size-3.5" aria-hidden />
            Add to Planning
          </Button>
        </div>
      ) : null}
      {responded ? (
        <p
          className={cn(
            "mt-2 font-mono text-[0.65rem] uppercase",
            approved === false ? "text-danger" : "text-accent",
          )}
        >
          {approved === false ? "Rejected" : "Added to your Planning board"}
        </p>
      ) : null}
    </div>
  );
}

function MemoryCard({
  part,
  onOpenMemory,
}: {
  part: NonNullable<ToolPart>;
  onOpenMemory?: () => void;
}) {
  const output = part.state === "output-available" ? part.output : null;
  const forgot = part.name === "deleteMemory";
  const content =
    output && typeof output === "object" && "content" in output
      ? String((output as { content: unknown }).content)
      : undefined;

  return (
    <div className="my-1 flex items-start gap-2 rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-xs">
      <Brain className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="text-foreground/80">
          {forgot
            ? "Forgot a memory."
            : (content ?? "Remembered something new.")}
        </span>
        {onOpenMemory ? (
          <button
            type="button"
            onClick={onOpenMemory}
            className="ml-2 cursor-pointer text-accent hover:underline"
          >
            View in Memory
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ToolCard({ part }: { part: ToolPart }) {
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
export function MessageParts({
  message,
  onOpenMemory,
  onRespondApproval,
}: {
  message: UIMessage;
  onOpenMemory?: () => void;
  onRespondApproval?: (approvalId: string, approved: boolean) => void;
}) {
  return (
    <>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return <Markdown key={i} text={part.text} />;
        }
        const toolPart = extractToolPart(part);
        if (!toolPart) return null;
        if (toolPart.name === "writeWeekPlan") {
          const approvalId =
            "approval" in toolPart ? toolPart.approval?.id : undefined;
          return (
            <PlanApprovalCard
              key={i}
              part={toolPart}
              onRespond={
                approvalId && onRespondApproval
                  ? (approved) => onRespondApproval(approvalId, approved)
                  : undefined
              }
            />
          );
        }
        if (MEMORY_TOOL_NAMES.has(toolPart.name)) {
          return (
            <MemoryCard key={i} part={toolPart} onOpenMemory={onOpenMemory} />
          );
        }
        return <ToolCard key={i} part={toolPart} />;
      })}
    </>
  );
}
