import { ICONS } from "./backgrounds";
import { LUCIDE_ICONS } from "./icons";
import { THREE_D_ICONS, THREE_D_KEYWORDS } from "./icons-3d";

export { THREE_D_KEYWORDS };

/** Minúsculas y sin tildes, para buscar "cafe" y encontrar "café". */
export const fold = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Palabras en español de cada icono de Lucide (el nombre en inglés también cuenta). */
export const LUCIDE_KEYWORDS: Record<string, string> = {
  "book-open": "libro manual guia lectura documentacion",
  "file-text": "archivo documento texto hoja politica",
  "clipboard-list": "lista portapapeles tareas pendientes puesto",
  "clipboard-check": "checklist revision verificacion lista aprobado limpieza",
  "list-checks": "lista tareas pasos proceso verificacion",
  calendar: "calendario fecha agenda reunion evento",
  "calendar-days": "calendario dias agenda semana horario turnos",
  clock: "reloj hora tiempo horario turno",
  users: "personas equipo grupo usuarios empleados",
  handshake: "acuerdo apreton manos bienvenida onboarding socios",
  "building-2": "edificio empresa oficina corporativo",
  store: "tienda sucursal restaurante local",
  "chef-hat": "chef cocina cocinero gorro receta",
  "utensils-crossed": "cubiertos comida restaurante menu tenedor cuchillo",
  coffee: "cafe taza bebida desayuno",
  pizza: "pizza comida",
  salad: "ensalada comida saludable verduras",
  soup: "sopa comida caldo",
  truck: "camion entrega envio proveedor logistica transporte",
  package: "paquete caja inventario bodega almacen",
  "shopping-cart": "carrito compras pedido mercado",
  receipt: "recibo factura cuenta gasto viaticos",
  wallet: "billetera dinero pago finanzas contabilidad",
  "chart-column": "grafico estadistica reporte ventas datos indicadores",
  lightbulb: "idea foco bombilla sugerencia innovacion",
  megaphone: "anuncio megafono comunicado noticias marketing",
  rocket: "cohete lanzamiento proyecto inicio",
  target: "meta objetivo diana blanco",
  shield: "escudo seguridad proteccion incidente",
  lock: "candado seguridad privado contrasena acceso",
  wrench: "llave herramienta mantenimiento reparacion soporte",
  settings: "ajustes configuracion engranaje",
  laptop: "computadora portatil laptop tecnologia sistemas",
  phone: "telefono llamada contacto celular",
  mail: "correo email mensaje carta",
  "message-circle": "mensaje chat conversacion comentario",
  "circle-help": "ayuda pregunta duda soporte faq",
  star: "estrella destacado favorito",
  heart: "corazon favorito me gusta bienestar",
  sparkles: "brillo nuevo destacado magia",
  "graduation-cap": "graduacion capacitacion curso formacion aprendizaje",
  map: "mapa ubicacion ruta sucursales",
  compass: "brujula orientacion direccion guia",
  leaf: "hoja planta natural ecologia verde",
  flame: "fuego llama cocina caliente urgente",
  award: "premio reconocimiento medalla logro",
};

/** Palabras en español de cada emoji de la lista. */
export const EMOJI_KEYWORDS: Record<string, string> = {
  "📄": "documento pagina hoja", "📝": "nota escribir apuntes", "📘": "libro manual azul", "📚": "libros biblioteca estudio",
  "🗂️": "carpetas archivo organizar", "📁": "carpeta archivo", "📌": "chincheta fijar importante", "📎": "clip adjunto",
  "✅": "listo hecho check aprobado", "📋": "portapapeles lista checklist", "🧾": "recibo factura viaticos", "📊": "grafico estadistica reporte",
  "📈": "grafico crecimiento ventas", "💡": "idea foco", "🎯": "meta objetivo diana", "🚀": "cohete lanzamiento proyecto",
  "🍽️": "plato comida restaurante cubiertos", "🥑": "aguacate comida", "🌮": "taco comida mexicana", "🍕": "pizza comida",
  "🍔": "hamburguesa comida", "☕": "cafe taza bebida", "🥗": "ensalada comida saludable", "🍋": "limon fruta",
  "🌶️": "chile picante", "🧑‍🍳": "chef cocinero cocina", "🛒": "carrito compras", "🥬": "lechuga verdura",
  "🚚": "camion entrega proveedor", "📦": "paquete caja inventario", "🏪": "tienda sucursal", "🏢": "edificio empresa oficina",
  "💻": "computadora laptop tecnologia", "🖥️": "computadora pantalla escritorio equipo", "🔐": "candado seguridad acceso", "🔧": "llave herramienta mantenimiento",
  "⚙️": "engranaje ajustes configuracion", "🧰": "caja herramientas soporte", "📞": "telefono llamada contacto", "✉️": "correo carta mensaje",
  "👋": "saludo hola bienvenida", "🤝": "apreton manos acuerdo", "👥": "personas equipo grupo", "🎉": "fiesta celebracion",
  "⭐": "estrella destacado favorito", "❓": "pregunta duda ayuda", "⚠️": "advertencia alerta cuidado incidente", "🛡️": "escudo seguridad proteccion",
};

export type IconMatch = { kind: "lucide"; name: string } | { kind: "3d"; name: string } | { kind: "emoji"; value: string } | { kind: "brand" };

const words = (text: string) => fold(text).split(/[\s-]+/).filter(Boolean);
/** Cada palabra buscada debe empezar alguna palabra del icono ("cap" encuentra "capacitacion"). */
function matches(query: string[], keywords: string) {
  const own = words(keywords);
  return query.every((q) => own.some((w) => w.startsWith(q)));
}

/** Busca iconos de los tres tipos (y el logo) por palabras en español o por el nombre del icono. */
export function searchIcons(query: string): IconMatch[] {
  const q = words(query);
  if (!q.length) return [];
  const found: IconMatch[] = [];
  if (matches(q, "logo grupo comidas marca empresa")) found.push({ kind: "brand" });
  for (const name of THREE_D_ICONS) if (matches(q, `${name} ${THREE_D_KEYWORDS[name]}`)) found.push({ kind: "3d", name });
  for (const name of Object.keys(LUCIDE_ICONS)) if (matches(q, `${name} ${LUCIDE_KEYWORDS[name] ?? ""}`)) found.push({ kind: "lucide", name });
  for (const value of ICONS) if (matches(q, EMOJI_KEYWORDS[value] ?? "")) found.push({ kind: "emoji", value });
  return found;
}

