"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);

  async function signIn() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setPending(false);
      alert(`Sign-in failed: ${error.message}`);
    }
  }

  return (
    <button className="button" onClick={signIn} disabled={pending}>
      {pending ? "Redirecting…" : "Sign in with Google"}
    </button>
  );
}
