"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sheet de shadcn/ui (sobre Radix Dialog), con los colores de la wiki: un panel que entra deslizándose desde un lado
 * con el fondo oscurecido. Las animaciones están en globals.css (`wiki-sheet-*`) y respetan "reducir movimiento".
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;
export const SheetDescription = SheetPrimitive.Description;

export function SheetContent({ side = "left", className, children, closeLabel = "Cerrar", ...props }: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "left" | "right"; closeLabel?: string;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="wiki-overlay fixed inset-0 z-40 bg-shade/45" />
      <SheetPrimitive.Content
        data-side={side}
        className={cn("wiki-sheet fixed inset-y-0 z-50 flex w-[85%] max-w-xs flex-col bg-paper shadow-2xl outline-none", side === "left" ? "left-0" : "right-0", className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close aria-label={closeLabel} className="absolute right-2 top-3 grid h-9 w-9 place-items-center rounded-md text-ink hover:bg-line/60">
          <X size={18} aria-hidden />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
