import { Building2, Calculator, Cpu, Package, ShoppingCart, UserRound, type LucideIcon } from "lucide-react";

/** Icono de Lucide para un departamento según su nombre, cuando no tiene uno propio en la base. */
export function departmentIconFor(name: string): LucideIcon {
  const n = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("tecnolog") || n.includes("sistemas")) return Cpu;
  if (n.includes("compra")) return ShoppingCart;
  if (n.includes("contabilidad") || n.includes("finanz")) return Calculator;
  if (n.includes("recursos") || n.includes("rrhh") || n.includes("humanos")) return UserRound;
  if (n.includes("logistic") || n.includes("almacen") || n.includes("bodega")) return Package;
  return Building2;
}
