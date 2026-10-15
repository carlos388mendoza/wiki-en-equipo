"use client";

import { useEffect, useState } from "react";
import { blocksToText, type WikiBlock } from "@/lib/blocks";
import { resolveConflicts, type MergeResult, type PageState } from "@/lib/editor/merge";
import { Modal } from "../ui/Modal";

const fieldLabel = { title: "Título", background: "Fondo", icon: "Icono", tags: "Etiquetas" } as const;

function preview(block: WikiBlock | null) {
  if (!block) return <em className="text-muted">(bloque borrado)</em>;
  const text = blocksToText([block]).trim();
  return text ? <span className="line-clamp-3 whitespace-pre-line">{text}</span> : <em className="text-muted">({block.type})</em>;
}

function fieldPreview(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.map((t) => `#${t}`).join(" ") : "(sin etiquetas)";
  if (value && typeof value === "object") return "Fondo personalizado";
  return String(value ?? "(vacío)");
}

/**
 * Resolver conflictos: tus cambios y los de otra persona tocaron lo mismo.
 * Lo que no choca ya se combinó solo; aquí se elige qué conservar en cada choque.
 */
export function ConflictDialog({ result, onResolve, onCancel, origin }: {
  result: MergeResult | null;
  onResolve: (state: PageState) => void;
  onCancel: () => void;
  origin: "reconnect" | "concurrent";
}) {
  const [choices, setChoices] = useState<Record<string, "mine" | "theirs">>({});
  useEffect(() => setChoices({}), [result]);
  if (!result) return null;

  const items0 = result.fieldConflicts.length;
  const items = [
    ...result.fieldConflicts.map((f) => ({ key: `field:${f.field}`, label: fieldLabel[f.field], mine: fieldPreview(f.mine), theirs: fieldPreview(f.theirs) })),
    ...result.conflicts.map((c, i) => ({
      key: c.id,
      label: `${items0 + i + 1}. ${c.kind === "edit" ? "Ambos editaron este bloque" : c.kind === "deleted-by-me" ? "Borraste este bloque, pero la otra persona lo editó" : "Editaste este bloque, pero la otra persona lo borró"}`,
      mine: preview(c.mine),
      theirs: preview(c.theirs),
    })),
  ];
  const setAll = (v: "mine" | "theirs") => setChoices(Object.fromEntries(items.map((i) => [i.key, v])));

  return (
    <Modal open onClose={onCancel} size="lg"
      title={origin === "reconnect" ? "Cambios mientras no tenías conexión" : "Alguien más editó lo mismo"}
      description="Ya combinamos todo lo que no chocaba. Elige qué versión conservar en cada caso.">
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAll("mine")} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-basil">Conservar todo lo mío</button>
          <button type="button" onClick={() => setAll("theirs")} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:border-basil">Usar todo lo de la otra persona</button>
        </div>
        <ol className="flex flex-col gap-3">
          {items.map((item) => {
            const choice = choices[item.key] ?? "mine";
            return (
              <li key={item.key} className="rounded-xl border border-line p-3">
                <p className="mb-2 font-medium">{item.label}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["mine", "theirs"] as const).map((side) => (
                    <label key={side} className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-2 ${choice === side ? "border-basil bg-basil-soft" : "border-line hover:border-basil"}`}>
                      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                        <input type="radio" name={item.key} checked={choice === side} onChange={() => setChoices((c) => ({ ...c, [item.key]: side }))} className="accent-basil" />
                        {side === "mine" ? "Tu versión" : "Versión de la otra persona"}
                      </span>
                      <span>{side === "mine" ? item.mine : item.theirs}</span>
                    </label>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <button type="button" onClick={() => onResolve(resolveConflicts(result, choices))} className="rounded-lg bg-ink px-4 py-2 font-medium text-white hover:bg-basil">
            Aplicar y guardar
          </button>
        </div>
      </div>
    </Modal>
  );
}
