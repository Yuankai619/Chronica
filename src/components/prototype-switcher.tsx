"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * PROTOTYPE ONLY — throwaway variant switcher. Delete with the variants.
 *
 * Floating bar that cycles a `?variant=` search param. Hidden in production.
 */
export function PrototypeSwitcher({
  variants,
  labels = {},
}: {
  variants: string[];
  labels?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("variant") ?? variants[0];
  const index = Math.max(0, variants.indexOf(current));

  function go(step: number) {
    const next = variants[(index + step + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable === true
      ) {
        return;
      }
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border-2 border-yellow-400 bg-black/90 px-2 py-1.5 shadow-2xl shadow-black/70">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous variant"
        className="cursor-pointer rounded-full px-2.5 py-1 text-sm text-yellow-400 hover:bg-yellow-400/15"
      >
        ←
      </button>
      <span className="px-2 font-mono text-xs text-yellow-400">
        PROTOTYPE {current}
        {labels[current] ? ` — ${labels[current]}` : ""}
      </span>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next variant"
        className="cursor-pointer rounded-full px-2.5 py-1 text-sm text-yellow-400 hover:bg-yellow-400/15"
      >
        →
      </button>
    </div>
  );
}
