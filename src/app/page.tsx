import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="landing">
      <h1>Chronica</h1>
      <p>Signed in as {user?.email}</p>
      <form action="/auth/signout" method="post">
        <button className="button button-secondary" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}
