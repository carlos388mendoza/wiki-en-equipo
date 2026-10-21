import { EMOJI_KEYWORDS, fold, LUCIDE_KEYWORDS } from "./icon-search";
import { localThreeD, THREE_D_CDN_IDS, THREE_D_ICONS, THREE_D_KEYWORDS } from "./icons-3d";

/**
 * Catálogo completo de iconos para el selector de icono y los patrones de fondo (#45, #46): los ~1.500 de Lucide,
 * los 120 iconos 3D y ~1.600 emojis. Lucide y los emojis se piden al abrir el selector (`/iconos/lucide/indice.json`
 * y `/iconos/emojis-es.json`, que se generan al compilar) y se guardan en memoria: la app no los carga si nadie
 * abre el selector.
 */
export type CatalogItem =
  | { kind: "lucide"; name: string; words: string[] }
  /** `cdnId`: uno de todos los de 3dicons (se elige estilo y ángulo); sin él, uno de los guardados en el repo. */
  | { kind: "3d"; name: string; cdnId?: string; words: string[] }
  /** `skins`: las 5 variantes de tono de piel (de claro a oscuro), si el emoji las tiene. */
  | { kind: "emoji"; value: string; label: string; group: number; skins?: string[]; words: string[] };
export type IconCatalog = { lucide: CatalogItem[]; threeD: CatalogItem[]; emojis: CatalogItem[]; emojiGroups: Record<number, string> };

const words = (text: string) => fold(text).split(/[^a-z0-9ñ]+/).filter(Boolean);

/**
 * Palabras en español → en inglés, para buscar los iconos de Lucide (sus etiquetas están en inglés).
 * Se buscan las dos: "taza" encuentra "cup" y "mug".
 */
export const ES_TO_EN: Record<string, string> = {
  abajo: "down arrow", abrir: "open", acuerdo: "handshake agreement", agenda: "calendar", agregar: "plus add", agua: "water droplet",
  ajustes: "settings cog", alarma: "alarm", alerta: "alert bell warning", almacen: "warehouse package", amor: "heart love", anuncio: "megaphone announcement",
  archivo: "file folder", arriba: "up arrow", atras: "back arrow left", audio: "audio volume", avion: "plane", ayuda: "help question circle-help",
  bandera: "flag", banco: "bank landmark", basura: "trash", bateria: "battery", bebida: "drink cup", bicicleta: "bike", billete: "banknote", billetera: "wallet",
  bodega: "warehouse", bolsa: "bag shopping", buscar: "search", busqueda: "search", caja: "box package", calendario: "calendar", calidad: "badge award",
  camara: "camera", camion: "truck", campana: "bell", candado: "lock", capacitacion: "graduation school", carne: "beef ham", carpeta: "folder", carrito: "cart shopping",
  carta: "mail letter", casa: "home house", celular: "smartphone phone mobile", chat: "message chat", cocina: "chef cooking utensils", cocinar: "chef cooking", cohete: "rocket",
  comida: "utensils food", compartir: "share", compras: "shopping cart bag", computadora: "computer laptop monitor", conexion: "wifi network", configuracion: "settings cog",
  contabilidad: "calculator receipt", contrasena: "lock key", copiar: "copy", corazon: "heart", correo: "mail email", cortar: "scissors cut", cubiertos: "utensils",
  cuchillo: "knife", cuenta: "user receipt", dato: "database", datos: "database chart", descargar: "download", diana: "target", dinero: "dollar banknote coins wallet",
  direccion: "map pin navigation", documento: "file text document", dulce: "candy cake", editar: "pencil edit", edificio: "building", eliminar: "trash delete",
  empresa: "building briefcase", engranaje: "cog settings", enlace: "link", entrega: "truck package delivery", equipo: "users team", error: "x alert bug",
  escribir: "pencil pen", escudo: "shield", estadistica: "chart bar", estrella: "star", etiqueta: "tag", evento: "calendar party", factura: "receipt", fecha: "calendar",
  finanzas: "dollar chart wallet", flecha: "arrow", foco: "lightbulb", foto: "image camera", fruta: "apple cherry citrus banana grape", fuego: "flame fire", gato: "cat",
  grafico: "chart", guardar: "save", hamburguesa: "sandwich", herramienta: "wrench hammer tool", hielo: "snowflake", hoja: "leaf file", hora: "clock",
  horario: "clock calendar", huevo: "egg", idea: "lightbulb", imagen: "image", impresora: "printer", incidente: "alert triangle siren", informacion: "info",
  inicio: "home house", internet: "globe wifi", inventario: "package boxes clipboard", juego: "gamepad", laptop: "laptop", lapiz: "pencil", leche: "milk", libro: "book",
  limpieza: "spray brush sparkles", lista: "list checklist", llamada: "phone", llave: "key", lluvia: "cloud rain", lupa: "search", luz: "lightbulb sun",
  mantenimiento: "wrench tool hammer", mapa: "map", mas: "plus", menu: "menu list", mensaje: "message", mercado: "store shopping", meta: "target goal flag",
  microfono: "mic", moneda: "coins", mundo: "globe earth", musica: "music", navegar: "compass navigation", noche: "moon", nota: "sticky note notebook", notas: "notebook sticky",
  nube: "cloud", nuevo: "plus sparkles", numero: "hash", oficina: "briefcase building", ojo: "eye", pago: "credit card wallet", palomita: "check", pan: "croissant wheat",
  pantalla: "monitor screen", papel: "file", papelera: "trash", pastel: "cake", pedido: "clipboard package", perro: "dog", persona: "user person", personas: "users",
  pescado: "fish", pez: "fish", pizza: "pizza", planta: "leaf sprout plant", pollo: "drumstick", postre: "cake ice cream dessert", premio: "award trophy medal",
  presentacion: "presentation", pregunta: "help question", proceso: "workflow list", producto: "package box", proveedor: "truck handshake", proyecto: "folder kanban rocket",
  receta: "chef book", recibo: "receipt", red: "network wifi", regalo: "gift", reloj: "clock watch", reporte: "file chart", restaurante: "utensils store", reunion: "users calendar",
  rapido: "zap fast", salud: "heart pulse", seguridad: "shield lock", semana: "calendar", servidor: "server", sobre: "mail", sol: "sun", soporte: "headset wrench help life buoy",
  sucursal: "store map pin", supermercado: "shopping cart store", tarea: "check list square", tarjeta: "credit card", taza: "cup mug coffee", tecnologia: "cpu laptop",
  telefono: "phone", tiempo: "clock timer", tienda: "store shop", tijeras: "scissors", tren: "train", trofeo: "trophy", usuario: "user", vaso: "cup glass",
  venta: "badge dollar chart", ventas: "chart dollar", verde: "leaf", verduras: "carrot salad", viaje: "plane luggage", video: "video", vino: "wine", wifi: "wifi",
  cafe: "coffee", te: "coffee tea", sopa: "soup", ensalada: "salad", helado: "ice cream", queso: "cheese", limon: "citrus", manzana: "apple", uva: "grape",
  basurero: "trash", alimento: "utensils apple", bebidas: "cup wine beer", cerveza: "beer", botella: "bottle milk", reciclar: "recycle", luna: "moon",
};

let loading: Promise<IconCatalog> | null = null;

/** Pide (una sola vez) los índices de Lucide y de emojis. Si falla (sin conexión), quedan solo los 3D y lo básico. */
export function loadIconCatalog(): Promise<IconCatalog> {
  loading ??= (async () => {
    const [lucideIndex, emojiIndex] = await Promise.all([
      fetch("/iconos/lucide/indice.json").then((r) => (r.ok ? r.json() as Promise<Record<string, string>> : {})).catch(() => ({} as Record<string, string>)),
      fetch("/iconos/emojis-es.json").then((r) => (r.ok ? r.json() as Promise<{ grupos: Record<number, string>; emojis: [string, string, number, string[]?][] }> : null)).catch(() => null),
    ]);
    return buildCatalog(lucideIndex, emojiIndex);
  })();
  return loading;
}

export function buildCatalog(lucideIndex: Record<string, string>, emojiIndex: { grupos: Record<number, string>; emojis: [string, string, number, string[]?][] } | null): IconCatalog {
  const lucideNames = Object.keys(lucideIndex).length ? Object.keys(lucideIndex) : Object.keys(LUCIDE_KEYWORDS);
  const lucide: CatalogItem[] = lucideNames.map((name) => ({ kind: "lucide", name, words: words(`${name} ${lucideIndex[name] ?? ""} ${LUCIDE_KEYWORDS[name] ?? ""}`) }));
  // Todos los de 3dicons (#46); los guardados en el repo que no están en la lista, al final.
  const fromCdn: CatalogItem[] = THREE_D_CDN_IDS.map((id) => {
    const local = localThreeD(id);
    const name = id.replace(/^[0-9a-f]{6}-/, "");
    return { kind: "3d", name, cdnId: id, words: words(`${name} ${local ? `${local} ${THREE_D_KEYWORDS[local]}` : ""}`) };
  });
  const covered = new Set(THREE_D_CDN_IDS.map(localThreeD).filter(Boolean));
  const threeD: CatalogItem[] = [...fromCdn, ...THREE_D_ICONS.filter((name) => !covered.has(name)).map((name): CatalogItem => ({ kind: "3d", name, words: words(`${name} ${THREE_D_KEYWORDS[name]}`) }))];
  const emojis: CatalogItem[] = emojiIndex
    ? emojiIndex.emojis.map(([value, text, group, skins]) => ({ kind: "emoji", value, label: text.split(" ").slice(0, 4).join(" "), group, ...(skins && { skins }), words: words(`${text} ${EMOJI_KEYWORDS[value] ?? ""}`) }))
    : Object.entries(EMOJI_KEYWORDS).map(([value, text]) => ({ kind: "emoji", value, label: text, group: 0, words: words(text) }));
  return { lucide, threeD, emojis, emojiGroups: emojiIndex?.grupos ?? {} };
}

/** Términos de búsqueda: lo escrito y, para Lucide, su traducción al inglés. */
function terms(query: string) {
  return words(query).map((term) => [term, ...(ES_TO_EN[term] ? words(ES_TO_EN[term]) : [])]);
}

const matches = (item: CatalogItem, query: string[][]) => query.every((alternatives) => alternatives.some((alt) => item.words.some((w) => w.startsWith(alt))));

/** Busca en el catálogo: cada palabra (o su traducción) debe empezar alguna palabra del icono. */
export function searchCatalog(catalog: IconCatalog, query: string, kinds: CatalogItem["kind"][] = ["3d", "lucide", "emoji"]) {
  const q = terms(query);
  if (!q.length) return [];
  const lists = { "3d": catalog.threeD, lucide: catalog.lucide, emoji: catalog.emojis };
  return kinds.flatMap((kind) => lists[kind].filter((item) => matches(item, q)));
}
