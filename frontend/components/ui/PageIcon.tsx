import Image from "next/image";
import { flagCode, flagSrc } from "@/lib/flags";
import { ICON_TONES, parseIcon } from "@/lib/icons";

/**
 * Icono de una página o plantilla: emoji, logo de Grupo Comidas, icono 3D (3dicons) o icono de Lucide sobre una tesela con
 * degradado, brillo y sombra (estilo 3D). `size` es la altura en píxeles.
 */
export function PageIcon({ icon, fallback = "📄", size = 20, className = "" }: {
  icon: string | null | undefined; fallback?: string; size?: number; className?: string;
}) {
  const parsed = parseIcon(icon) ?? parseIcon(fallback);
  if (parsed?.kind === "3d" || parsed?.kind === "brand") {
    // Imagen local (public/iconos/3d o public/brand): se optimiza con next/image.
    return <Image src={parsed.src} alt="" aria-hidden width={size} height={size} className={`inline-block shrink-0 object-contain ${className}`} style={{ width: size, height: size }} />;
  }
  if (!parsed || parsed.kind === "emoji") {
    // Banderas de países como imagen: en Windows el emoji se ve como dos letras (#46).
    const flag = flagCode(parsed?.value ?? fallback);
    if (flag) return <Image src={flagSrc(flag)} alt="" aria-hidden width={Math.round(size * 4 / 3)} height={size} className={`inline-block shrink-0 rounded-[3px] object-cover shadow-sm ${className}`} style={{ width: Math.round(size * 0.9 * 4 / 3), height: Math.round(size * 0.9) }} />;
    return (
      <span aria-hidden className={`inline-block leading-none ${className}`} style={{ fontSize: size }}>
        {parsed?.value ?? fallback}
      </span>
    );
  }
  const [light, dark] = ICON_TONES[parsed.tone];
  const { Icon } = parsed;
  return (
    <span
      aria-hidden
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{
        width: size, height: size, borderRadius: size * 0.26,
        backgroundImage: `linear-gradient(145deg, ${light} 0%, ${dark} 100%)`,
        boxShadow: size >= 32
          ? `inset 0 ${size * 0.04}px ${size * 0.06}px rgb(255 255 255 / 0.45), inset 0 -${size * 0.05}px ${size * 0.08}px rgb(0 0 0 / 0.18), 0 ${size * 0.08}px ${size * 0.18}px rgb(29 36 32 / 0.25)`
          : "inset 0 1px 1px rgb(255 255 255 / 0.4)",
      }}
    >
      {/* Brillo superior */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2" style={{ background: "linear-gradient(180deg, rgb(255 255 255 / 0.28), transparent)" }} />
      {Icon ? <Icon size={size * 0.56} color="white" strokeWidth={size >= 32 ? 2 : 2.4} className="relative drop-shadow-sm" />
        // Los demás iconos de Lucide (#46): su SVG generado al compilar, en blanco con una máscara (no carga código).
        : <span className="relative drop-shadow-sm" style={{ width: size * 0.56, height: size * 0.56, backgroundColor: "white", WebkitMask: `url(/iconos/lucide/${parsed.name}.svg) center / contain no-repeat`, mask: `url(/iconos/lucide/${parsed.name}.svg) center / contain no-repeat` }} />}
    </span>
  );
}
