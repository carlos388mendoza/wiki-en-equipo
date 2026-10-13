import type { Background } from "./types";

/** Fondos listos para elegir. Colores en tonos de la marca y complementarios. */
export const COLORS = [
  "#e3efe8", "#fbf0da", "#f8e6e2", "#dce2de", "#eef6ff", "#f7f3ff",
  "#fff4df", "#e7f7f0", "#2e6a4f", "#c9861f", "#1d2420", "#b4432f",
];

export const GRADIENTS: { name: string; value: string }[] = [
  { name: "Albahaca y azafrán", value: "linear-gradient(120deg, #2e6a4f 0%, #e3a33a 100%)" },
  { name: "Huerta", value: "linear-gradient(135deg, #e3efe8 0%, #fbf0da 100%)" },
  { name: "Amanecer", value: "linear-gradient(135deg, #fff4df 0%, #fff0ed 100%)" },
  { name: "Menta", value: "linear-gradient(135deg, #e7f7f0 0%, #eef6ff 100%)" },
  { name: "Lavanda", value: "linear-gradient(135deg, #eef6ff 0%, #f7f3ff 100%)" },
  { name: "Tomate", value: "linear-gradient(135deg, #f8e6e2 0%, #fbf0da 100%)" },
  { name: "Bosque", value: "linear-gradient(160deg, #1d2420 0%, #2e6a4f 100%)" },
  { name: "Brasa", value: "linear-gradient(135deg, #b4432f 0%, #c9861f 100%)" },
  { name: "Noche", value: "linear-gradient(135deg, #1d2420 0%, #3b4a43 100%)" },
  { name: "Papel", value: "linear-gradient(180deg, #ffffff 0%, #f4f6f4 100%)" },
];

export const PATTERN_EMOJIS = ["🍽️", "🥑", "🌮", "🍕", "☕", "🥗", "🍋", "🌶️", "🧾", "📊", "💻", "📦", "⭐", "🌿", "🎉", "🔧"];
export const PATTERN_COLORS = ["#fbf0da", "#e3efe8", "#f8e6e2", "#eef6ff", "#f4f6f4", "#fff4df"];

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;

/** Galería de Unsplash (sin necesidad de clave de API). */
export const PHOTO_GALLERY: { group: string; photos: { url: string; alt: string }[] }[] = [
  {
    group: "Comida y restaurantes",
    photos: [
      { url: unsplash("1504674900247-0877df9cc836"), alt: "Mesa con platos de comida" },
      { url: unsplash("1517248135467-4c7edcad34c4"), alt: "Interior de restaurante" },
      { url: unsplash("1414235077428-338989a2e8c0"), alt: "Mesa servida en restaurante" },
      { url: unsplash("1490818387583-1baba5e638af"), alt: "Comida fresca" },
      { url: unsplash("1556909114-f6e7ad7d3136"), alt: "Cocina" },
      { url: unsplash("1495195134817-aeb325a55b65"), alt: "Preparación de alimentos" },
      { url: unsplash("1466637574441-749b8f19452f"), alt: "Ingredientes" },
      { url: unsplash("1512621776951-a57141f2eefd"), alt: "Ensalada" },
      { url: unsplash("1504754524776-8f4f37790ca0"), alt: "Plato preparado" },
      { url: unsplash("1565299624946-b28f40a0ae38"), alt: "Pizza" },
      { url: unsplash("1540189549336-e6e99c3679fe"), alt: "Plato saludable" },
      { url: unsplash("1555396273-367ea4eb4db5"), alt: "Restaurante" },
    ],
  },
  {
    group: "Trabajo y oficina",
    photos: [
      { url: unsplash("1554224155-6726b3ff858f"), alt: "Escritorio con documentos" },
      { url: unsplash("1556761175-5973dc0f32e7"), alt: "Reunión de trabajo" },
      { url: unsplash("1522071820081-009f0129c71c"), alt: "Equipo trabajando" },
      { url: unsplash("1497366216548-37526070297c"), alt: "Oficina" },
      { url: unsplash("1542744173-8e7e53415bb0"), alt: "Presentación en reunión" },
      { url: unsplash("1521791136064-7986c2920216"), alt: "Apretón de manos" },
      { url: unsplash("1454165804606-c3d57bc86b40"), alt: "Documentos y gráficos" },
      { url: unsplash("1484480974693-6ca0a78fb36b"), alt: "Cuaderno" },
      { url: unsplash("1486312338219-ce68d2c6f44d"), alt: "Computadora portátil" },
      { url: unsplash("1531403009284-440f080d1e12"), alt: "Planificación con notas" },
      { url: unsplash("1497215728101-856f4ea42174"), alt: "Espacio de trabajo" },
      { url: unsplash("1528605248644-14dd04022da1"), alt: "Celebración en equipo" },
    ],
  },
  {
    group: "Naturaleza y abstractos",
    photos: [
      { url: unsplash("1506905925346-21bda4d32df4"), alt: "Montañas" },
      { url: unsplash("1470071459604-3b5ec3a7fe05"), alt: "Paisaje" },
      { url: unsplash("1501785888041-af3ef285b470"), alt: "Lago" },
      { url: unsplash("1441974231531-c6227db76b6e"), alt: "Bosque" },
      { url: unsplash("1500530855697-b586d89ba3ee"), alt: "Camino" },
      { url: unsplash("1557683316-973673baf926"), alt: "Degradado abstracto" },
      { url: unsplash("1579546929518-9e396f3cc809"), alt: "Colores abstractos" },
      { url: unsplash("1550684848-fac1c5b4e853"), alt: "Formas abstractas" },
    ],
  },
];

export const ICONS = [
  "📄", "📝", "📘", "📚", "🗂️", "📁", "📌", "📎", "✅", "📋", "🧾", "📊", "📈", "💡", "🎯", "🚀",
  "🍽️", "🥑", "🌮", "🍕", "🍔", "☕", "🥗", "🍋", "🌶️", "🧑‍🍳", "🛒", "🥬", "🚚", "📦", "🏪", "🏢",
  "💻", "🖥️", "🔐", "🔧", "⚙️", "🧰", "📞", "✉️", "👋", "🤝", "👥", "🎉", "⭐", "❓", "⚠️", "🛡️",
];

export const defaultBackground: Background = { type: "gradient", value: GRADIENTS[1].value };
