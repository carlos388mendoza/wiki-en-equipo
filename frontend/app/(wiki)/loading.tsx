export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10" aria-busy="true" aria-label="Cargando">
      <div className="h-40 animate-pulse rounded-2xl bg-line/70" />
      <div className="mt-8 h-8 w-1/2 animate-pulse rounded bg-line/70" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl bg-line/70" />)}
      </div>
    </div>
  );
}
