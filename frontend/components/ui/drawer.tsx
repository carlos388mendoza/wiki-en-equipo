"use client";

import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

/**
 * Drawer de shadcn/ui (sobre vaul), con los colores de la wiki: una ventana que sube desde abajo y se cierra
 * deslizándola hacia abajo o tocando afuera.
 */
export const Drawer = DrawerPrimitive.Root;
export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;
export const DrawerTitle = DrawerPrimitive.Title;
export const DrawerDescription = DrawerPrimitive.Description;

export function DrawerContent({ className, children, ...props }: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-40 bg-shade/45" />
      <DrawerPrimitive.Content
        className={cn("fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-2xl border border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none", className)}
        {...props}
      >
        {/* Asa para deslizar hacia abajo */}
        <div aria-hidden className="mx-auto mb-1 mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-line" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}
