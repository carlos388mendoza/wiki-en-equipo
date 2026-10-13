export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8" aria-busy="true" aria-label="Cargando">
      <div className="h-9 w-56 animate-pulse rounded bg-line/70" />
      <div className="mt-8 flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-line/70" />)}
      </div>
    </div>
  );
}
