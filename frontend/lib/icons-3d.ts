/**
 * Iconos 3D (3dicons, CC0, colección v1, estilo "color", ángulo "dynamic"): archivo `public/iconos/3d/<nombre>.webp`
 * (se copia desde `assets/templates/3dicons/`) y palabras en español para buscarlos. Se guardan como `3d:<nombre>`.
 * Los 8 primeros tienen nombre en español porque los usan las plantillas por defecto.
 */
export const THREE_D_KEYWORDS = {
  documentacion: "cuaderno libreta documentacion documento notas",
  bienvenida: "corazon bienvenida bienvenido equipo amor",
  "inicio-departamento": "bandera inicio departamento muro meta",
  proceso: "check visto proceso pasos aprobado listo hecho",
  acta: "calendario acta reunion fecha agenda",
  receta: "vaso cafe receta bebida para llevar",
  "apertura-cierre": "llave apertura cierre sucursal acceso",
  preguntas: "chat burbuja preguntas frecuentes dudas faq mensaje",
  "3d-coin": "moneda dinero pago 3d",
  "3d": "3d cubo modelo",
  at: "arroba correo email mencion",
  axe: "hacha herramienta",
  back: "atras regresar flecha",
  backward: "retroceder atras anterior",
  bag: "bolsa compras tienda",
  battery: "bateria energia carga",
  bell: "campana notificacion aviso alerta",
  "bookmark-fav": "marcador favorito guardado",
  bookmark: "marcador guardar lectura",
  boy: "nino persona usuario hombre",
  brush: "pincel pintar diseno",
  bucket: "cubeta balde limpieza",
  bulb: "foco idea bombilla",
  calculator: "calculadora cuentas contabilidad",
  calender: "calendario fecha agenda mes",
  "call-end": "colgar llamada telefono",
  "call-in": "llamada entrante telefono",
  "call-missed": "llamada perdida telefono",
  "call-only": "telefono llamada",
  "call-out": "llamada saliente telefono",
  "call-ringing": "telefono sonando llamada",
  camera: "camara foto fotografia",
  can: "lata bebida refresco",
  chart: "grafico estadistica reporte ventas",
  "chat-text": "chat mensaje texto conversacion",
  chat: "chat conversacion mensaje",
  chess: "ajedrez estrategia juego",
  circle: "circulo forma",
  clock: "reloj hora tiempo horario",
  "color-palette": "paleta colores diseno",
  computer: "computadora pantalla sistemas tecnologia",
  copy: "copiar duplicar",
  "credit-card": "tarjeta credito pago",
  crown: "corona premio lider",
  cube: "cubo caja forma",
  cup: "copa taza trofeo",
  dollar: "dolar dinero moneda",
  eth: "ethereum cripto moneda",
  euro: "euro dinero moneda",
  explorer: "explorar brujula navegar",
  eyedropper: "gotero color diseno",
  "file-fav": "archivo favorito documento",
  "file-new": "archivo nuevo documento",
  "file-text": "archivo texto documento politica",
  file: "archivo documento hoja",
  fire: "fuego llama cocina urgente",
  flash: "rayo rapido energia",
  "folder-fav": "carpeta favorita archivos",
  "folder-new": "carpeta nueva archivos",
  folder: "carpeta archivos documentos",
  forward: "adelante siguiente flecha",
  gift: "regalo premio sorpresa",
  girl: "nina persona usuaria mujer",
  glass: "vaso bebida agua",
  gym: "gimnasio pesas ejercicio salud",
  hash: "numeral etiqueta hashtag",
  headphone: "audifonos musica soporte",
  lab: "laboratorio quimica prueba",
  link: "enlace vinculo cadena",
  location: "ubicacion mapa lugar",
  lock: "candado seguridad privado",
  locker: "casillero locker guardar",
  "magic-trick": "magia sombrero truco",
  mail: "correo carta email mensaje",
  "map-pin": "ubicacion mapa sucursal lugar",
  medal: "medalla premio reconocimiento",
  megaphone: "megafono anuncio comunicado",
  mic: "microfono audio grabar",
  mobile: "celular telefono movil",
  "money-bag": "bolsa dinero ahorro",
  money: "dinero billete pago",
  moon: "luna noche",
  music: "musica nota cancion",
  next: "siguiente adelante",
  "notify-heart": "notificacion corazon me gusta",
  "painting-brush": "brocha pintura pintar",
  "painting-kit": "pintura kit arte",
  pencil: "lapiz escribir editar",
  picture: "imagen foto cuadro",
  pin: "chincheta fijar importante",
  pause: "pausa detener video",
  play: "reproducir video play",
  plus: "mas agregar nuevo",
  pound: "libra dinero moneda",
  puzzle: "rompecabezas pieza solucion",
  rocket: "cohete lanzamiento proyecto",
  "roll-brush": "rodillo pintura pintar",
  rupee: "rupia dinero moneda",
  scissor: "tijeras cortar",
  setting: "ajustes configuracion engranaje",
  shield: "escudo seguridad proteccion",
  sphere: "esfera bola forma",
  star: "estrella destacado favorito",
  sun: "sol dia clima",
  target: "diana meta objetivo",
  "tea-cup": "taza te cafe bebida",
  text: "texto letra tipografia",
  "thumb-down": "no me gusta pulgar abajo",
  "thumb-up": "me gusta pulgar arriba aprobado",
  toggle: "interruptor activar opcion",
  tools: "herramientas mantenimiento soporte reparacion",
  "trash-can": "basura papelera eliminar",
  travel: "viaje maleta viaticos",
  trophy: "trofeo premio logro",
  umbrella: "paraguas sombrilla lluvia",
  "video-cam": "camara video grabar",
  wallet: "billetera cartera dinero",
  wifi: "wifi internet conexion red",
  yuan: "yuan dinero moneda",
  zoom: "lupa buscar zoom",
} as const;

export type ThreeDIcon = keyof typeof THREE_D_KEYWORDS;
export const THREE_D_ICONS = Object.keys(THREE_D_KEYWORDS) as ThreeDIcon[];

/* ---------- Todos los de 3dicons, desde su CDN (#46) ---------- */

import { THREE_D_CDN_IDS } from "./icons-3d-cdn-ids";
export { THREE_D_CDN_IDS };

export const THREE_D_STYLES = { color: "Color", premium: "Premium", gradient: "Degradado", clay: "Arcilla" } as const;
export const THREE_D_ANGLES = { dynamic: "Dinámico", front: "De frente", iso: "Isométrico" } as const;
export type ThreeDStyle = keyof typeof THREE_D_STYLES;
export type ThreeDAngle = keyof typeof THREE_D_ANGLES;

/** Los 8 de las plantillas tienen nombre en español: su id en 3dicons. */
const LOCAL_BY_ID: Record<string, ThreeDIcon> = {
  "628100-notebook": "documentacion", "1acc3d-heart": "bienvenida", "e9828b-flag": "inicio-departamento", "1b714e-tick": "proceso",
  "781f28-calendar": "acta", "abab3a-takeway-cup": "receta", "778c78-key": "apertura-cierre", "eec43d-chat-bubble": "preguntas",
};

/** El icono guardado en el repo para un id de 3dicons (solo existe en estilo color y ángulo dinámico). */
export function localThreeD(id: string): ThreeDIcon | null {
  if (LOCAL_BY_ID[id]) return LOCAL_BY_ID[id];
  const name = id.replace(/^[0-9a-f]{6}-/, "");
  return (THREE_D_ICONS as readonly string[]).includes(name) ? (name as ThreeDIcon) : null;
}

const CDN_PATTERN = /^3d:([0-9a-f]{6}-[a-z0-9-]+):(dynamic|front|iso):(color|premium|gradient|clay)$/;
const CDN_SET = new Set(THREE_D_CDN_IDS);

/** Valor que se guarda: el archivo local si existe en ese estilo; si no, `3d:<id>:<ángulo>:<estilo>` (CDN). */
export function threeDValue(id: string, angle: ThreeDAngle, style: ThreeDStyle): string {
  const local = angle === "dynamic" && style === "color" ? localThreeD(id) : null;
  return local ? `3d:${local}` : `3d:${id}:${angle}:${style}`;
}

/** Un icono 3D del CDN guardado (`3d:<id>:<ángulo>:<estilo>`), o `null` si no es válido. */
export function parseCdnThreeD(value: string): { id: string; angle: ThreeDAngle; style: ThreeDStyle; src: string } | null {
  const m = value.match(CDN_PATTERN);
  if (!m || !CDN_SET.has(m[1])) return null;
  return { id: m[1], angle: m[2] as ThreeDAngle, style: m[3] as ThreeDStyle, src: `https://bvconuycpdvgzbvbkijl.supabase.co/storage/v1/object/public/sizes/${m[1]}/${m[2]}/200/${m[3]}.webp` };
}
