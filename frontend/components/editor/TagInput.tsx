"use client";

import { useId, useState } from "react";
import { Tag, X } from "lucide-react";

const MAX_TAGS = 30;
const MAX_LENGTH = 40;

/** Etiquetas de la página (sirven como categorías para filtrar y buscar). */
export function TagInput({ value, onChange, suggestions }: { value: string[]; onChange: (tags: string[]) => void; suggestions: string[] }) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "").toLowerCase().slice(0, MAX_LENGTH);
    if (!tag || value.includes(tag) || value.length >= MAX_TAGS) return;
    onChange([...value, tag]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag size={14} className="text-muted" aria-hidden />
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-strong">
          #{t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Quitar etiqueta ${t}`} className="rounded hover:bg-brand hover:text-white">
            <X size={12} />
          </button>
        </span>
      ))}
      {value.length < MAX_TAGS && (
        <>
          <input
            value={draft}
            list={listId}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(",")) { add(v.slice(0, -1)); setDraft(""); } else setDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); add(draft); setDraft(""); }
              if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
            }}
            onBlur={() => { if (draft) { add(draft); setDraft(""); } }}
            placeholder={value.length ? "Agregar…" : "Agregar etiqueta (Enter)"}
            aria-label="Agregar etiqueta"
            className="h-7 w-40 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <datalist id={listId}>
            {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
          </datalist>
        </>
      )}
    </div>
  );
}
