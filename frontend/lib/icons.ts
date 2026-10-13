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
  albahaca: ["#4f9a76", "#2e6a4f"],
  azafran: ["#efb54f", "#c9861f"],
  tomate: ["#e2735c", "#b4432f"],
  cielo: ["#6fa0d6", "#3b6ea5"],
  uva: ["#a77fd1", "#7a4fa3"],
  carbon: ["#4b5a52", "#1d2420"],
} as const;
export type IconTone = keyof typeof ICON_TONES;

const PATTERN = /^lucide:([a-z0-9-]{1,30}):([a-z]{2,10})$/;

export type ParsedIcon = { kind: "emoji"; value: string } | { kind: "lucide"; Icon: LucideIcon; name: string; tone: IconTone };

export function parseIcon(icon: string | null | undefined): ParsedIcon | null {
  if (!icon) return null;
  const m = icon.match(PATTERN);
  if (m) {
    if (!Object.hasOwn(LUCIDE_ICONS, m[1])) return null;
    const Icon = LUCIDE_ICONS[m[1]];
    const tone = (Object.hasOwn(ICON_TONES, m[2]) ? m[2] : "albahaca") as IconTone;
    return { kind: "lucide", Icon, name: m[1], tone };
  }
  return icon.startsWith("lucide:") ? null : { kind: "emoji", value: icon };
}

export const lucideIcon = (name: string, tone: IconTone) => `lucide:${name}:${tone}`;

/** Valida el icono guardado: emoji corto o un icono de Lucide conocido. */
export function sanitizeIcon(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("lucide:")) return parseIcon(value)?.kind === "lucide" ? value : null;
  return value.slice(0, 16);
}
