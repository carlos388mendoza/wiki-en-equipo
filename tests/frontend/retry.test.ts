import { describe, expect, it } from "vitest";
import { conflictRetryDelay, MAX_CONFLICT_RETRIES } from "../../frontend/lib/editor/retry";

describe("reintentos por conflicto en la edición en vivo (#6)", () => {
  it("tiene un máximo: después ya no reintenta (se pasa a combinar los cambios)", () => {
    expect(MAX_CONFLICT_RETRIES).toBe(3);
    expect(conflictRetryDelay(MAX_CONFLICT_RETRIES)).toBeNull();
    expect(conflictRetryDelay(10)).toBeNull();
  });

  it("espera cada vez más entre intentos", () => {
    const sinAzar = () => 0;
    const delays = [0, 1, 2].map((attempt) => conflictRetryDelay(attempt, sinAzar));
    expect(delays).toEqual([400, 800, 1600]);
  });

  it("agrega un poco de azar (hasta +50 %) para que dos personas no choquen otra vez a la vez", () => {
    expect(conflictRetryDelay(0, () => 1)).toBe(600);
    expect(conflictRetryDelay(2, () => 0.5)).toBe(2000);
  });
});
