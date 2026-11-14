export default function Loading() {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true" aria-label="Loading workflows">
      {/* Top navigation skeleton */}
      <div
        aria-hidden="true"
        className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background px-3 sm:px-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded-[7px] bg-muted" />
          <div className="h-3.5 w-24 rounded-md bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-36 rounded-full bg-muted" />
          <div className="size-8 rounded-md bg-muted" />
          <div className="size-8 rounded-full bg-muted" />
        </div>
      </div>

      {/* Page skeleton */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl animate-pulse px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Title row */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-40 rounded-md bg-muted" />
              <div className="h-4 w-64 rounded-md bg-muted" />
            </div>
            <div className="h-9 w-32 rounded-md bg-muted" />
          </div>

          {/* Stats strip */}
          <div className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl border border-border/70 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 border-r border-border/60 p-5 last:border-r-0">
                <div className="h-3 w-20 rounded-md bg-muted" />
                <div className="h-7 w-14 rounded-md bg-muted" />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border/70">
            <div className="flex gap-6 border-b border-border/60 px-4 py-3">
              {["w-32", "w-24", "w-20", "w-12"].map((w, i) => (
                <div key={i} className={`h-3 ${w} rounded-md bg-muted`} />
              ))}
            </div>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-6 border-b border-border/60 px-4 py-4 last:border-b-0">
                <div className="h-4 w-40 rounded-md bg-muted" />
                <div className="h-5 w-20 rounded-full bg-muted" />
                <div className="h-4 w-24 rounded-md bg-muted" />
                <div className="h-5 w-9 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
