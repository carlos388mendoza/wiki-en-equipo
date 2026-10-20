import type { Background } from "./types";

/** Fondos listos para elegir: los colores del logo (rojo, amarillo y negro), el azul de los enlaces y tonos claros. */
export const COLORS = [
  "#fde9eb", "#fff6c7", "#e8f0fa", "#f8f6f4", "#e7e1df", "#f7f3ff",
  "#fff4df", "#fbe8e4", "#e2001a", "#fddb00", "#1b1717", "#1f5fae",
];

export const GRADIENTS: { name: string; value: string }[] = [
  { name: "Grupo Comidas", value: "linear-gradient(120deg, #e2001a 0%, #ff5a1f 60%, #fddb00 100%)" },
  { name: "Mostaza", value: "linear-gradient(135deg, #fff6c7 0%, #fde9eb 100%)" },
  { name: "Amanecer", value: "linear-gradient(135deg, #fff4df 0%, #fff0ed 100%)" },
  { name: "Cielo", value: "linear-gradient(135deg, #e8f0fa 0%, #fff6c7 100%)" },
  { name: "Lavanda", value: "linear-gradient(135deg, #eef6ff 0%, #f7f3ff 100%)" },
  { name: "Tomate", value: "linear-gradient(135deg, #fde9eb 0%, #fff6c7 100%)" },
  { name: "Salsa", value: "linear-gradient(160deg, #1b1717 0%, #b30015 100%)" },
  { name: "Brasa", value: "linear-gradient(135deg, #e2001a 0%, #fddb00 100%)" },
  { name: "Noche", value: "linear-gradient(135deg, #1b1717 0%, #4a4444 100%)" },
  { name: "Papel", value: "linear-gradient(180deg, #ffffff 0%, #f8f6f4 100%)" },
];

export const PATTERN_EMOJIS = ["🍽️", "🥑", "🌮", "🍕", "☕", "🥗", "🍋", "🌶️", "🧾", "📊", "💻", "📦", "⭐", "🌿", "🎉", "🔧"];
export const PATTERN_COLORS = ["#fff6c7", "#fde9eb", "#fbe8e4", "#e8f0fa", "#f8f6f4", "#fff4df"];

const photo = (id: string) => `https://images.unsplash.com/photo-${id}`;

/** Galería fija de fotos (enlaces directos a images.unsplash.com, sin clave de API). */
export const PHOTO_GALLERY: { group: string; photos: { url: string; alt: string }[] }[] = [
  {
    group: "Comida y restaurantes",
    photos: [
      { url: photo("1504674900247-0877df9cc836"), alt: "Mesa con platos de comida" },
      { url: photo("1517248135467-4c7edcad34c4"), alt: "Interior de restaurante" },
      { url: photo("1414235077428-338989a2e8c0"), alt: "Mesa servida en restaurante" },
      { url: photo("1490818387583-1baba5e638af"), alt: "Comida fresca" },
      { url: photo("1556909114-f6e7ad7d3136"), alt: "Cocina" },
      { url: photo("1495195134817-aeb325a55b65"), alt: "Preparación de alimentos" },
      { url: photo("1466637574441-749b8f19452f"), alt: "Ingredientes" },
      { url: photo("1512621776951-a57141f2eefd"), alt: "Ensalada" },
      { url: photo("1504754524776-8f4f37790ca0"), alt: "Plato preparado" },
      { url: photo("1565299624946-b28f40a0ae38"), alt: "Pizza" },
      { url: photo("1540189549336-e6e99c3679fe"), alt: "Plato saludable" },
      { url: photo("1555396273-367ea4eb4db5"), alt: "Restaurante" },
    ],
  },
  {
    group: "Trabajo y oficina",
    photos: [
      { url: photo("1554224155-6726b3ff858f"), alt: "Escritorio con documentos" },
      { url: photo("1556761175-5973dc0f32e7"), alt: "Reunión de trabajo" },
      { url: photo("1522071820081-009f0129c71c"), alt: "Equipo trabajando" },
      { url: photo("1497366216548-37526070297c"), alt: "Oficina" },
      { url: photo("1542744173-8e7e53415bb0"), alt: "Presentación en reunión" },
      { url: photo("1521791136064-7986c2920216"), alt: "Apretón de manos" },
      { url: photo("1454165804606-c3d57bc86b40"), alt: "Documentos y gráficos" },
      { url: photo("1484480974693-6ca0a78fb36b"), alt: "Cuaderno" },
      { url: photo("1486312338219-ce68d2c6f44d"), alt: "Computadora portátil" },
      { url: photo("1531403009284-440f080d1e12"), alt: "Planificación con notas" },
      { url: photo("1497215728101-856f4ea42174"), alt: "Espacio de trabajo" },
      { url: photo("1528605248644-14dd04022da1"), alt: "Celebración en equipo" },
    ],
  },
  {
    group: "Naturaleza y abstractos",
    photos: [
      { url: photo("1506905925346-21bda4d32df4"), alt: "Montañas" },
      { url: photo("1470071459604-3b5ec3a7fe05"), alt: "Paisaje" },
      { url: photo("1501785888041-af3ef285b470"), alt: "Lago" },
      { url: photo("1441974231531-c6227db76b6e"), alt: "Bosque" },
      { url: photo("1500530855697-b586d89ba3ee"), alt: "Camino" },
      { url: photo("1557683316-973673baf926"), alt: "Degradado abstracto" },
      { url: photo("1579546929518-9e396f3cc809"), alt: "Colores abstractos" },
      { url: photo("1550684848-fac1c5b4e853"), alt: "Formas abstractas" },
    ],
  },
];

export const ICONS = [
  "📄", "📝", "📘", "📚", "🗂️", "📁", "📌", "📎", "✅", "📋", "🧾", "📊", "📈", "💡", "🎯", "🚀",
  "🍽️", "🥑", "🌮", "🍕", "🍔", "☕", "🥗", "🍋", "🌶️", "🧑‍🍳", "🛒", "🥬", "🚚", "📦", "🏪", "🏢",
  "💻", "🖥️", "🔐", "🔧", "⚙️", "🧰", "📞", "✉️", "👋", "🤝", "👥", "🎉", "⭐", "❓", "⚠️", "🛡️",
];

export const defaultBackground: Background = { type: "gradient", value: GRADIENTS[1].value };
