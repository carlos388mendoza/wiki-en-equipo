import Image from "next/image";
import logo from "@/public/brand/logo-grupo-comidas.png";

/**
 * Logo oficial de Grupo Comidas (circular, 512 px). next/image genera las versiones 1x y 2x
 * del tamaño pedido, así se ve nítido en celulares y pantallas de alta densidad sin deformarse.
 */
export function BrandLogo({ size, priority = false, className = "", decorative = false }: {
  size: number; priority?: boolean; className?: string; decorative?: boolean;
}) {
  return (
    <Image
      src={logo}
      alt={decorative ? "" : "Grupo Comidas"}
      aria-hidden={decorative || undefined}
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      className={`shrink-0 rounded-full object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
