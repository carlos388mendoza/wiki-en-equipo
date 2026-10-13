/**
 * Dominios que `next/image` puede optimizar. Deben coincidir con
 * `images.remotePatterns` de `next.config.ts`.
 */
export const OPTIMIZED_IMAGE_HOSTS = ["images.unsplash.com", "images.pexels.com"];

/**
 * `true` si la imagen puede pasar por el optimizador de Next. Las subidas a la
 * wiki necesitan la cookie de sesión, así que se muestran sin optimizar
 * (siempre con el componente `Image`).
 */
export function isOptimizableImage(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && OPTIMIZED_IMAGE_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}
