export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8" aria-busy="true" aria-label="Cargando plantillas">
      <div className="h-9 w-48 animate-pulse rounded bg-line/70" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-line/70" />)}
      </div>
    </div>
  );
}
