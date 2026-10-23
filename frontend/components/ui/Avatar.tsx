import { initials } from "@/lib/format";

const tones = ["bg-brand text-white", "bg-sun text-on-sun", "bg-ink text-on-ink", "bg-sky text-on-sky", "bg-brand-soft text-brand-strong"];

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
