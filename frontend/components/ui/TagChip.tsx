import Link from "next/link";

export function TagChip({ tag, active = false, asLink = true }: { tag: string; active?: boolean; asLink?: boolean }) {
  const cls = `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
    active ? "bg-basil text-white" : "bg-basil-soft text-basil hover:bg-basil hover:text-white"
  }`;
  if (!asLink) return <span className={cls}>#{tag}</span>;
  return (
    <Link href={`/buscar?etiqueta=${encodeURIComponent(tag)}`} className={cls}>
      #{tag}
    </Link>
  );
}
