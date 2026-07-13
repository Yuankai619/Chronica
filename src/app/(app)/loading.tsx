/** Instant skeleton while a page's server data loads. */
export default function Loading() {
  return (
    <main aria-busy className="animate-pulse">
      <div className="mb-6 h-7 w-48 rounded-md bg-panel" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="h-20 rounded-lg border border-hairline bg-panel/50" />
        <div className="h-20 rounded-lg border border-hairline bg-panel/50" />
        <div className="hidden h-20 rounded-lg border border-hairline bg-panel/50 sm:block" />
      </div>
      <div className="h-40 rounded-lg border border-hairline bg-panel/30" />
    </main>
  );
}
