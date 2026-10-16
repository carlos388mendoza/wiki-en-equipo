import Link from "next/link";

export function TagChip({ tag, active = false, asLink = true }: { tag: string; active?: boolean; asLink?: boolean }) {
  const cls = `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
    active ? "bg-brand text-white" : "bg-brand-soft text-brand-strong hover:bg-brand hover:text-white"
  }`;
  if (!asLink) return <span className={cls}>#{tag}</span>;
  return (
    <Link href={`/buscar?etiqueta=${encodeURIComponent(tag)}`} className={cls}>
      #{tag}
    </Link>
  );
}
