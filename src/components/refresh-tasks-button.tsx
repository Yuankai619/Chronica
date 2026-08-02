"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshTasks } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";

/** Escape hatch from the 60-second task cache. */
export function RefreshTasksButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshTasks();
        })
      }
    >
      <RefreshCw
        className={pending ? "size-3.5 animate-spin" : "size-3.5"}
        aria-hidden
      />
      Refresh
    </Button>
  );
}
