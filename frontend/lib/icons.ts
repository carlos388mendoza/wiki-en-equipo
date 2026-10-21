import {
  Award, BookOpen, Building2, Calendar, CalendarDays, ChartColumn, ChefHat, CircleHelp, ClipboardCheck, ClipboardList,
  Clock, Coffee, Compass, FileText, Flame, GraduationCap, Handshake, Heart, Laptop, Leaf, Lightbulb, ListChecks, Lock,
  Mail, Map, Megaphone, MessageCircle, Package, Phone, Pizza, Receipt, Rocket, Salad, Settings, Shield, ShoppingCart,
  Soup, Sparkles, Star, Store, Target, Truck, Users, UtensilsCrossed, Wallet, Wrench, type LucideIcon,
} from "lucide-react";

/**
 * Iconos de página. Además de emojis, una página o plantilla puede usar un icono
 * de Lucide (uno de los recursos sugeridos) guardado como `lucide:<nombre>:<tono>`.
 */
export const LUCIDE_ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen, "file-text": FileText, "clipboard-list": ClipboardList, "clipboard-check": ClipboardCheck,
  "list-checks": ListChecks, calendar: Calendar, "calendar-days": CalendarDays, clock: Clock, users: Users,
  handshake: Handshake, "building-2": Building2, store: Store, "chef-hat": ChefHat, "utensils-crossed": UtensilsCrossed,
  coffee: Coffee, pizza: Pizza, salad: Salad, soup: Soup, truck: Truck, package: Package, "shopping-cart": ShoppingCart,
  receipt: Receipt, wallet: Wallet, "chart-column": ChartColumn, lightbulb: Lightbulb, megaphone: Megaphone,
  rocket: Rocket, target: Target, shield: Shield, lock: Lock, wrench: Wrench, settings: Settings, laptop: Laptop,
  phone: Phone, mail: Mail, "message-circle": MessageCircle, "circle-help": CircleHelp, star: Star, heart: Heart,
  sparkles: Sparkles, "graduation-cap": GraduationCap, map: Map, compass: Compass, leaf: Leaf, flame: Flame, award: Award,
};

/** Tonos de la tesela: degradado (claro → oscuro) en los colores de la marca y complementarios. */
export const ICON_TONES = {
  rojo: ["#ff4b5c", "#e2001a"],
  albahaca: ["#4f9a76", "#2e6a4f"],
  azafran: ["#efb54f", "#c9861f"],
  tomate: ["#e2735c", "#b4432f"],
  cielo: ["#5b8fd6", "#1f5fae"],
  uva: ["#a77fd1", "#7a4fa3"],
  carbon: ["#4a4444", "#1b1717"],
} as const;
export type IconTone = keyof typeof ICON_TONES;

const PATTERN = /^lucide:([a-z0-9-]{1,40}):([a-z]{2,10})$/;

/**
 * Iconos 3D (3dicons, CC0): los 120 de lib/icons-3d.ts. Se guardan como `3d:<nombre>`;
 * los archivos viven en assets/templates/3dicons y se sirven en /iconos/3d/<nombre>.webp.
 */
import { parseCdnThreeD, THREE_D_ICONS } from "./icons-3d";
import { LUCIDE_NAMES } from "./lucide-names";
export { THREE_D_ICONS };

/** Logo oficial de Grupo Comidas como icono de página (muros, bienvenida, anuncios del grupo). */
export const BRAND_ICON = "marca:grupo-comidas";
export const BRAND_LOGO_SRC = "/brand/logo-grupo-comidas.png";
/** Logo animado de Grupo Comidas (600×200, WebP animado hecho del GIF original de assets/brand/franquicias). */
export const BRAND_BANNER_SRC = "/brand/franquicias/grupo-comidas-animado.webp";
export const isBrandImage = (url: string) => url.startsWith("/brand/");
/**
 * Logos de la pestaña "Grupo Comidas" del selector de iconos: `marca:<id>`. Los de las franquicias tienen fondo
 * transparente (originales en assets/brand/franquicias). `wide`: el animado es rectangular y se dibuja sobre negro.
 */
export const BRANDS: Record<string, { label: string; src: string; wide?: boolean }> = {
  "grupo-comidas": { label: "Grupo Comidas", src: BRAND_LOGO_SRC },
  "grupo-comidas-animado": { label: "Grupo Comidas (animado)", src: BRAND_BANNER_SRC, wide: true },
  "pizza-hut": { label: "Pizza Hut", src: "/brand/franquicias/pizza-hut.webp" },
  kfc: { label: "KFC", src: "/brand/franquicias/kfc.webp" },
  dennys: { label: "Denny's", src: "/brand/franquicias/dennys.webp" },
  "china-wok": { label: "China Wok", src: "/brand/franquicias/china-wok.webp" },
};

export type ParsedIcon =
  | { kind: "emoji"; value: string }
  /** `Icon` solo en los iconos de Lucide que la app trae siempre; los demás se dibujan con /iconos/lucide/<nombre>.svg. */
  | { kind: "lucide"; Icon: LucideIcon | null; name: string; tone: IconTone }
  | { kind: "3d"; name: string; src: string }
  | { kind: "brand"; src: string; wide?: boolean };

export function parseIcon(icon: string | null | undefined): ParsedIcon | null {
  if (!icon) return null;
  if (icon.startsWith("marca:")) {
    const brand = Object.hasOwn(BRANDS, icon.slice(6)) ? BRANDS[icon.slice(6)] : null;
    return brand ? { kind: "brand", src: brand.src, ...(brand.wide && { wide: true }) } : null;
  }
  if (icon.startsWith("3d:")) {
    // Del CDN de 3dicons (cualquier estilo y ángulo, #46) o de los 120 guardados en el repo.
    const cdn = parseCdnThreeD(icon);
    if (cdn) return { kind: "3d", name: icon.slice(3), src: cdn.src };
    const name = icon.slice(3);
    return (THREE_D_ICONS as readonly string[]).includes(name) ? { kind: "3d", name, src: `/iconos/3d/${name}.webp` } : null;
  }
  const m = icon.match(PATTERN);
  if (m) {
    // Cualquier icono de Lucide (#46): los más usados vienen en la app; el resto, como imagen generada al compilar.
    if (!Object.hasOwn(LUCIDE_ICONS, m[1]) && !LUCIDE_NAMES.has(m[1])) return null;
    const Icon = Object.hasOwn(LUCIDE_ICONS, m[1]) ? LUCIDE_ICONS[m[1]] : null;
    const tone = (Object.hasOwn(ICON_TONES, m[2]) ? m[2] : "rojo") as IconTone;
    return { kind: "lucide", Icon, name: m[1], tone };
  }
  return icon.startsWith("lucide:") ? null : { kind: "emoji", value: icon };
}

export const lucideIcon = (name: string, tone: IconTone) => `lucide:${name}:${tone}`;

/** Valida el icono guardado: emoji corto, icono de Lucide, icono 3D o el logo de la marca. */
export function sanitizeIcon(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("lucide:") || value.startsWith("3d:") || value.startsWith("marca:")) return parseIcon(value) ? value : null;
  return value.slice(0, 16);
}
