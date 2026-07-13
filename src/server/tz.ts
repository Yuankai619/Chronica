import "server-only";

import { cookies } from "next/headers";
import { isValidTimeZone, TZ_COOKIE } from "@/lib/tz";

/** The user's IANA timezone from the client-set cookie; UTC fallback. */
export async function getUserTimeZone(): Promise<string> {
  const store = await cookies();
  const value = store.get(TZ_COOKIE)?.value;
  return value && isValidTimeZone(value) ? value : "UTC";
}
