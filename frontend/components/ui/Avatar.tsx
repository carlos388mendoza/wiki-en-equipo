import { initials } from "@/lib/format";

const tones = ["bg-basil text-white", "bg-saffron text-white", "bg-ink text-white", "bg-basil-soft text-basil"];

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const tone = tones[name.length % tones.length];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}
