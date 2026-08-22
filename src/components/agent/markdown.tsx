"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Chat-bubble-scale markdown: small, tight spacing, themed off the
 * existing dark-mode tokens rather than a full typography plugin.
 */
const components: Components = {
  p: ({ className, ...props }) => (
    <p
      className={cn(
        "text-sm leading-relaxed whitespace-pre-wrap text-foreground/90",
        className,
      )}
      {...props}
    />
  ),
  strong: ({ className, ...props }) => (
    <strong
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      target="_blank"
      rel="noreferrer"
      className={cn("text-accent underline underline-offset-2", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "list-disc space-y-1 pl-5 text-sm text-foreground/90",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "list-decimal space-y-1 pl-5 text-sm text-foreground/90",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("leading-relaxed", className)} {...props} />
  ),
  h1: ({ className, ...props }) => (
    <h1
      className={cn("mt-2 text-base font-semibold text-foreground", className)}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn("mt-2 text-sm font-semibold text-foreground", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn("mt-2 text-sm font-semibold text-foreground/90", className)}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "border-l-2 border-hairline pl-3 text-sm text-muted italic",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("my-2 border-hairline", className)} {...props} />
  ),
  code: ({ className, children, ...props }) => (
    <code
      className={cn(
        "rounded bg-panel px-1 py-0.5 font-mono text-[0.8em] text-foreground/90",
        className,
      )}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "overflow-x-auto rounded-md bg-panel p-2.5 font-mono text-xs text-foreground/90",
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-xs", className)}
        {...props}
      />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border-b border-hairline px-2 py-1 text-left font-medium text-muted",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn("border-b border-hairline px-2 py-1", className)}
      {...props}
    />
  ),
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
