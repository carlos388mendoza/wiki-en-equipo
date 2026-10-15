export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Abriendo el editor">
      <div className="h-11 border-b border-line bg-paper" />
      <div className="h-40 animate-pulse bg-line/70 sm:h-52" />
      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <div className="-mt-10 h-16 w-16 animate-pulse rounded-xl bg-line" />
        <div className="mt-6 h-12 w-2/3 animate-pulse rounded bg-line/70" />
        <div className="mt-10 flex flex-col gap-3">{[100, 90, 95, 60].map((w, i) => <div key={i} className="h-4 animate-pulse rounded bg-line/70" style={{ width: `${w}%` }} />)}</div>
      </div>
    </div>
  );
}
