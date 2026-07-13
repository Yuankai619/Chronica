"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE } from "@/lib/tz";

/**
 * Keeps the server's notion of "today" aligned with the user:
 * - writes the browser's IANA timezone into a cookie (refreshing the
 *   page once when it was missing or changed), and
 * - refreshes server data right after local midnight so quick-start,
 *   calendar items, and today's stats roll over without a manual reload.
 */
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TZ_COOKIE}=`))
      ?.split("=")[1];
    if (current !== timeZone) {
      document.cookie = `${TZ_COOKIE}=${timeZone}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 5, 0); // a few seconds past midnight
    const timeout = setTimeout(
      () => router.refresh(),
      nextMidnight.getTime() - now.getTime(),
    );
    return () => clearTimeout(timeout);
  }, [router]);

  return null;
}
