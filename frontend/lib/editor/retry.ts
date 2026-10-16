/**
 * Reintentos de guardado ante un conflicto (409) durante la edición en vivo: el documento ya incluye los
 * cambios de los demás, así que basta con volver a guardar sobre la versión nueva. Con mucha actividad
 * eso podría repetirse sin fin, por eso hay un máximo y una espera creciente entre intentos.
 */
export const MAX_CONFLICT_RETRIES = 3;
const BASE_DELAY_MS = 400;

/**
 * Espera antes del reintento número `attempt` (0 = el primero), con un poco de azar para que dos
 * personas no vuelvan a chocar al mismo tiempo. `null` si ya no quedan reintentos.
 */
export function conflictRetryDelay(attempt: number, random: () => number = Math.random): number | null {
  if (attempt >= MAX_CONFLICT_RETRIES) return null;
  return Math.round(BASE_DELAY_MS * 2 ** attempt * (1 + random() * 0.5));
}
