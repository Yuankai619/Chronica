"use client";

import { useTransition } from "react";
import { unlinkMicrosoft } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export function MicrosoftLinkCard({
  linkedUsername,
  status,
}: {
  linkedUsername: string | null | undefined;
  status?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardTitle>Microsoft To Do</CardTitle>
      {status === "error" ? (
        <p className="mb-3 text-sm text-danger">Linking failed — try again.</p>
      ) : null}
      {status === "unconfigured" ? (
        <p className="mb-3 text-sm text-danger">
          Server is missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET.
        </p>
      ) : null}
      {linkedUsername !== undefined && linkedUsername !== null ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Linked as <span className="font-medium">{linkedUsername}</span>
          </p>
          <p className="text-xs text-muted">
            Read-only: tasks can be attached to time entries; nothing is ever
            written back to To Do.
          </p>
          <Button
            variant="outline"
            className="self-start"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await unlinkMicrosoft();
              })
            }
          >
            {pending ? "Unlinking…" : "Unlink"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Link a Microsoft account to attach To Do tasks to your time entries
            and build a per-task time-cost history.
          </p>
          <Button
            className="self-start"
            onClick={() => {
              window.location.href = "/api/microsoft/link";
            }}
          >
            Link Microsoft account
          </Button>
        </div>
      )}
    </Card>
  );
}
