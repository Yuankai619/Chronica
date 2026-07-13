"use client";

import { useRef, useState, useTransition } from "react";
import {
  addPrinciple,
  deletePrinciple,
} from "@/app/(app)/settings/principles-actions";
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";

type Principle = Tables<"principles">;

export function PrinciplesCard({ principles }: { principles: Principle[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await addPrinciple(formData);
      setError(result.error ?? null);
      if (!result.error) formRef.current?.reset();
    });
  }

  return (
    <Card>
      <CardTitle>Personal principles</CardTitle>
      <p className="mb-3 text-sm text-muted">
        Free-text rules for your time use (e.g. “stop working when tired”). The
        AI Retro checks each week against them.
      </p>
      {principles.length > 0 ? (
        <ul className="mb-4 flex flex-col">
          {principles.map((principle) => (
            <li
              key={principle.id}
              className="flex items-center justify-between gap-3 border-b border-hairline py-2"
            >
              <span className="text-sm">{principle.content}</span>
              <Button
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deletePrinciple(principle.id);
                  })
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <form ref={formRef} action={submit} className="flex gap-2">
        <Input name="content" placeholder="New principle" maxLength={500} />
        <Button type="submit" disabled={pending}>
          Add
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </Card>
  );
}
