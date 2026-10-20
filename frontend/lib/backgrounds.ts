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

/** Foto de la galería: descripción (también es el texto alternativo) y etiquetas en español para buscarla. */
export type GalleryPhoto = { url: string; alt: string; tags: string };

/** Galería fija de fotos (enlaces directos a images.unsplash.com, sin clave de API), con etiquetas para buscar. */
export const PHOTO_GALLERY: { group: string; photos: GalleryPhoto[] }[] = [
  {
    group: "Comida",
    photos: [
      { url: photo("1504674900247-0877df9cc836"), alt: "Mesa con platos de comida", tags: "comida platos mesa almuerzo" },
      { url: photo("1490818387583-1baba5e638af"), alt: "Comida fresca", tags: "comida fresca saludable plato" },
      { url: photo("1512621776951-a57141f2eefd"), alt: "Ensalada", tags: "ensalada saludable verduras comida" },
      { url: photo("1504754524776-8f4f37790ca0"), alt: "Plato preparado", tags: "plato comida desayuno" },
      { url: photo("1565299624946-b28f40a0ae38"), alt: "Pizza", tags: "pizza comida italiana" },
      { url: photo("1540189549336-e6e99c3679fe"), alt: "Plato saludable", tags: "saludable ensalada comida verduras" },
      { url: photo("1546069901-ba9599a7e63c"), alt: "Bowl con salmón y verduras", tags: "bowl salmon pescado ensalada saludable comida" },
      { url: photo("1565958011703-44f9829ba187"), alt: "Pastel con frambuesas", tags: "postre pastel dulce frutas reposteria" },
      { url: photo("1567620905732-2d1ec7ab7445"), alt: "Panqueques", tags: "panqueques desayuno dulce" },
      { url: photo("1512058564366-18510be2db19"), alt: "Arroz frito", tags: "arroz comida plato oriental" },
      { url: photo("1473093295043-cdd812d0e601"), alt: "Ensalada de pasta", tags: "pasta ensalada comida italiana" },
      { url: photo("1476224203421-9ac39bcb3327"), alt: "Platos para compartir", tags: "comida platos compartir mesa" },
      { url: photo("1484723091739-30a097e8f929"), alt: "Tostadas francesas con fruta", tags: "desayuno tostadas dulce frutas" },
      { url: photo("1482049016688-2d3e1b311543"), alt: "Tostada de aguacate y huevo", tags: "desayuno aguacate huevo saludable" },
      { url: photo("1493770348161-369560ae357d"), alt: "Desayuno servido", tags: "desayuno mesa cafe frutas" },
      { url: photo("1490645935967-10de6ba17061"), alt: "Bowl saludable", tags: "saludable bowl verduras huevo comida" },
      { url: photo("1555939594-58d7cb561ad1"), alt: "Carnes a la parrilla", tags: "parrilla carne asado pollo comida" },
      { url: photo("1551782450-a2132b4ba21d"), alt: "Hamburguesa con papas", tags: "hamburguesa papas fritas comida rapida" },
      { url: photo("1568901346375-23c9450c58cd"), alt: "Hamburguesa", tags: "hamburguesa comida rapida" },
      { url: photo("1513104890138-7c749659a591"), alt: "Pizza en rebanadas", tags: "pizza comida italiana" },
      { url: photo("1574071318508-1cdbab80d002"), alt: "Pizza margarita", tags: "pizza margarita comida italiana" },
      { url: photo("1565299585323-38d6b0865b47"), alt: "Tacos", tags: "tacos comida mexicana" },
      { url: photo("1600891964092-4316c288032e"), alt: "Carne con papas", tags: "carne res papas plato comida" },
    ],
  },
  {
    group: "Restaurantes y cafeterías",
    photos: [
      { url: photo("1517248135467-4c7edcad34c4"), alt: "Interior de restaurante", tags: "restaurante salon interior" },
      { url: photo("1414235077428-338989a2e8c0"), alt: "Mesa servida en restaurante", tags: "restaurante mesa servicio" },
      { url: photo("1555396273-367ea4eb4db5"), alt: "Restaurante", tags: "restaurante salon terraza" },
      { url: photo("1559339352-11d035aa65de"), alt: "Terraza de restaurante", tags: "restaurante terraza mar exterior" },
      { url: photo("1552566626-52f8b828add9"), alt: "Salón de restaurante", tags: "restaurante salon mesas interior" },
      { url: photo("1550966871-3ed3cdb5ed0c"), alt: "Comedor de restaurante", tags: "restaurante comedor mesas elegante" },
      { url: photo("1466978913421-dad2ebd01d17"), alt: "Personas compartiendo comida", tags: "restaurante personas compartir comida clientes" },
      { url: photo("1555244162-803834f70033"), alt: "Bufé", tags: "bufe buffet catering eventos comida" },
      { url: photo("1495474472287-4d71bcdd2085"), alt: "Brindis con café", tags: "cafe tazas brindis cafeteria" },
      { url: photo("1509042239860-f550ce710b93"), alt: "Cafés con arte latte", tags: "cafe latte cafeteria tazas" },
      { url: photo("1442512595331-e89e73853f31"), alt: "Barista preparando café", tags: "cafe barista cafeteria preparar" },
      { url: photo("1497935586351-b67a49e012bf"), alt: "Granos de café", tags: "cafe granos cafeteria" },
      { url: photo("1514432324607-a09d9b4aefdd"), alt: "Taza de café", tags: "cafe taza negro bebida" },
      { url: photo("1501339847302-ac426a4a7cbb"), alt: "Letrero de cafetería", tags: "cafe cafeteria letrero local" },
      { url: photo("1554118811-1e0d58224f24"), alt: "Interior de cafetería", tags: "cafeteria cafe interior local" },
    ],
  },
  {
    group: "Cocina e ingredientes",
    photos: [
      { url: photo("1556909114-f6e7ad7d3136"), alt: "Cocina", tags: "cocina cocinar preparacion" },
      { url: photo("1495195134817-aeb325a55b65"), alt: "Preparación de alimentos", tags: "cocina preparacion cocinar alimentos" },
      { url: photo("1466637574441-749b8f19452f"), alt: "Ingredientes", tags: "ingredientes verduras cocina limpieza" },
      { url: photo("1556910103-1c02745aae4d"), alt: "Equipo cocinando", tags: "cocina cocinar equipo personas" },
      { url: photo("1556909172-54557c7e4fb7"), alt: "Cocina con estufa", tags: "cocina estufa equipo" },
      { url: photo("1556911220-bff31c812dba"), alt: "Cocina moderna", tags: "cocina moderna limpia" },
      { url: photo("1577219491135-ce391730fb2c"), alt: "Chef emplatando", tags: "chef cocinero cocina emplatar" },
      { url: photo("1528712306091-ed0763094c98"), alt: "Cocinando en sartén", tags: "cocinar sarten cocina receta" },
      { url: photo("1498837167922-ddd27525d352"), alt: "Verduras frescas", tags: "verduras ingredientes frescos mercado" },
      { url: photo("1606787366850-de6330128bfc"), alt: "Ingredientes variados", tags: "ingredientes frutas verduras despensa" },
      { url: photo("1586201375761-83865001e31c"), alt: "Granos de arroz", tags: "arroz granos ingredientes textura" },
      { url: photo("1542838132-92c53300491e"), alt: "Frutas y verduras en exhibición", tags: "frutas verduras mercado supermercado compras" },
      { url: photo("1488459716781-31db52582fe9"), alt: "Puesto de mercado", tags: "mercado frutas verduras compras" },
    ],
  },
  {
    group: "Oficina y equipo",
    photos: [
      { url: photo("1554224155-6726b3ff858f"), alt: "Escritorio con documentos", tags: "oficina escritorio documentos" },
      { url: photo("1556761175-5973dc0f32e7"), alt: "Reunión de trabajo", tags: "reunion trabajo equipo oficina" },
      { url: photo("1522071820081-009f0129c71c"), alt: "Equipo trabajando", tags: "equipo trabajo personas oficina" },
      { url: photo("1497366216548-37526070297c"), alt: "Oficina", tags: "oficina espacio trabajo" },
      { url: photo("1542744173-8e7e53415bb0"), alt: "Presentación en reunión", tags: "presentacion reunion capacitacion equipo" },
      { url: photo("1521791136064-7986c2920216"), alt: "Apretón de manos", tags: "acuerdo bienvenida manos onboarding" },
      { url: photo("1454165804606-c3d57bc86b40"), alt: "Documentos y gráficos", tags: "documentos graficos reporte" },
      { url: photo("1484480974693-6ca0a78fb36b"), alt: "Cuaderno", tags: "cuaderno notas preguntas" },
      { url: photo("1486312338219-ce68d2c6f44d"), alt: "Computadora portátil", tags: "computadora laptop tecnologia" },
      { url: photo("1531403009284-440f080d1e12"), alt: "Planificación con notas", tags: "planificacion notas proceso" },
      { url: photo("1497215728101-856f4ea42174"), alt: "Espacio de trabajo", tags: "oficina espacio trabajo" },
      { url: photo("1528605248644-14dd04022da1"), alt: "Celebración en equipo", tags: "celebracion equipo fiesta logro" },
      { url: photo("1497366811353-6870744d04b2"), alt: "Oficina luminosa", tags: "oficina espacio sala" },
      { url: photo("1497366754035-f200968a6e72"), alt: "Pasillo de oficina", tags: "oficina pasillo moderna" },
      { url: photo("1504384308090-c894fdcc538d"), alt: "Oficina abierta", tags: "oficina abierta equipo escritorios" },
      { url: photo("1524758631624-e2822e304c36"), alt: "Sala de espera", tags: "oficina recepcion sala espera" },
      { url: photo("1519389950473-47ba0277781c"), alt: "Equipo con computadoras", tags: "equipo computadoras reunion tecnologia" },
      { url: photo("1600880292203-757bb62b4baf"), alt: "Equipo celebrando", tags: "equipo celebracion logro reunion" },
      { url: photo("1552664730-d307ca884978"), alt: "Reunión con notas adhesivas", tags: "reunion planificacion equipo ideas" },
      { url: photo("1531482615713-2afd69097998"), alt: "Compañeros frente a la computadora", tags: "equipo computadora trabajo ayuda" },
      { url: photo("1517245386807-bb43f82c33c4"), alt: "Reunión con laptop", tags: "reunion laptop conversacion" },
      { url: photo("1551434678-e076c223a692"), alt: "Personas trabajando en computadoras", tags: "equipo oficina computadoras trabajo" },
      { url: photo("1553877522-43269d4ea984"), alt: "Laptops en una mesa", tags: "laptops oficina blanco negro" },
      { url: photo("1521737604893-d14cc237f11d"), alt: "Equipo en mesa de trabajo", tags: "equipo mesa trabajo reunion" },
      { url: photo("1557804506-669a67965ba0"), alt: "Presentación al equipo", tags: "presentacion equipo reunion capacitacion" },
      { url: photo("1517048676732-d65bc937f952"), alt: "Reunión con apuntes", tags: "reunion apuntes acta equipo" },
      { url: photo("1434030216411-0b793f4b4173"), alt: "Persona escribiendo", tags: "escribir notas estudiar apuntes" },
      { url: photo("1488190211105-8b0e65b80b4e"), alt: "Escritorio con libreta y café", tags: "escritorio libreta cafe planificacion" },
      { url: photo("1506784983877-45594efa4cbe"), alt: "Agenda con café", tags: "agenda calendario planificacion cafe" },
      { url: photo("1450101499163-c8848c66ca85"), alt: "Firmando documentos", tags: "firmar documentos contrato acuerdo" },
    ],
  },
  {
    group: "Datos, tecnología y operaciones",
    photos: [
      { url: photo("1460925895917-afdab827c52f"), alt: "Laptop con gráficos", tags: "datos graficos reportes ventas tecnologia" },
      { url: photo("1551288049-bebda4e38f71"), alt: "Tablero de datos", tags: "datos tablero indicadores tecnologia" },
      { url: photo("1560472354-b33ff0c44a43"), alt: "Pantalla con estadísticas", tags: "datos estadisticas reportes analitica" },
      { url: photo("1517433456452-f9633a875f6f"), alt: "Teclado iluminado", tags: "teclado tecnologia computadora sistemas" },
      { url: photo("1563013544-824ae1b704d3"), alt: "Pago con tarjeta en línea", tags: "pago tarjeta compras finanzas linea" },
      { url: photo("1579621970563-ebec7560ff3e"), alt: "Planta creciendo sobre monedas", tags: "finanzas dinero ahorro contabilidad crecimiento" },
      { url: photo("1586528116311-ad8dd3c8310d"), alt: "Bodega", tags: "bodega almacen inventario logistica" },
      { url: photo("1534723452862-4c874018d66d"), alt: "Pasillo de supermercado", tags: "supermercado compras inventario productos" },
      { url: photo("1581091226825-a6a2a5aee158"), alt: "Técnica en un laboratorio", tags: "tecnica laboratorio mantenimiento ingenieria" },
      { url: photo("1504328345606-18bbc8c9d7d1"), alt: "Soldadura", tags: "soldadura mantenimiento reparacion taller" },
      { url: photo("1581092160562-40aa08e78837"), alt: "Planos sobre la mesa", tags: "planos proyecto ingenieria construccion" },
    ],
  },
  {
    group: "Naturaleza",
    photos: [
      { url: photo("1506905925346-21bda4d32df4"), alt: "Montañas", tags: "montanas paisaje naturaleza" },
      { url: photo("1470071459604-3b5ec3a7fe05"), alt: "Paisaje", tags: "paisaje naturaleza neblina" },
      { url: photo("1501785888041-af3ef285b470"), alt: "Lago", tags: "lago montanas naturaleza" },
      { url: photo("1441974231531-c6227db76b6e"), alt: "Bosque", tags: "bosque arboles naturaleza verde" },
      { url: photo("1500530855697-b586d89ba3ee"), alt: "Camino", tags: "camino carretera paisaje viaje" },
      { url: photo("1469474968028-56623f02e42e"), alt: "Montañas al atardecer", tags: "montanas atardecer paisaje naturaleza" },
      { url: photo("1447752875215-b2761acb3c5d"), alt: "Puente en el bosque", tags: "bosque puente naturaleza verde" },
      { url: photo("1426604966848-d7adac402bff"), alt: "Valle con montañas", tags: "valle montanas paisaje naturaleza" },
      { url: photo("1472214103451-9374bd1c798e"), alt: "Colinas verdes", tags: "colinas verde paisaje naturaleza" },
      { url: photo("1465146344425-f00d5f5c8f07"), alt: "Campo de flores", tags: "flores campo naturaleza primavera" },
      { url: photo("1490750967868-88aa4486c946"), alt: "Flores amarillas", tags: "flores amarillo naturaleza primavera" },
      { url: photo("1507525428034-b723cf961d3e"), alt: "Playa al atardecer", tags: "playa mar atardecer vacaciones" },
      { url: photo("1505142468610-359e7d316be0"), alt: "Olas del mar", tags: "mar olas playa azul" },
      { url: photo("1433086966358-54859d0ed716"), alt: "Cascada", tags: "cascada agua bosque naturaleza" },
      { url: photo("1418065460487-3e41a6c84dc5"), alt: "Bosque con neblina", tags: "bosque neblina arboles naturaleza" },
      { url: photo("1475924156734-496f6cac6ec1"), alt: "Atardecer en la costa", tags: "atardecer costa mar cielo" },
    ],
  },
  {
    group: "Abstractos",
    photos: [
      { url: photo("1557683316-973673baf926"), alt: "Degradado abstracto", tags: "abstracto degradado colores fondo" },
      { url: photo("1579546929518-9e396f3cc809"), alt: "Colores abstractos", tags: "abstracto colores degradado fondo" },
      { url: photo("1550684848-fac1c5b4e853"), alt: "Formas abstractas", tags: "abstracto formas fondo" },
      { url: photo("1557682250-33bd709cbe85"), alt: "Degradado morado", tags: "abstracto degradado morado fondo" },
      { url: photo("1558591710-4b4a1ae0f04d"), alt: "Ondas blancas", tags: "abstracto blanco ondas fondo claro" },
      { url: photo("1553356084-58ef4a67b2a7"), alt: "Pintura fluida", tags: "abstracto pintura azul rosa fondo" },
    ],
  },
];

/** Minúsculas y sin tildes. */
const foldText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Busca fotos de la galería por su descripción, sus etiquetas o su grupo, en español y sin importar tildes.
 * Cada palabra buscada debe empezar alguna palabra de la foto ("coci" encuentra "cocina").
 */
export function searchPhotos(query: string): GalleryPhoto[] {
  const terms = foldText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return PHOTO_GALLERY.flatMap((g) => g.photos.filter((p) => {
    const words = foldText(`${p.alt} ${p.tags} ${g.group}`).split(/[^a-z0-9ñ]+/).filter(Boolean);
    return terms.every((term) => words.some((word) => word.startsWith(term)));
  }));
}

export const ICONS = [
  "📄", "📝", "📘", "📚", "🗂️", "📁", "📌", "📎", "✅", "📋", "🧾", "📊", "📈", "💡", "🎯", "🚀",
  "🍽️", "🥑", "🌮", "🍕", "🍔", "☕", "🥗", "🍋", "🌶️", "🧑‍🍳", "🛒", "🥬", "🚚", "📦", "🏪", "🏢",
  "💻", "🖥️", "🔐", "🔧", "⚙️", "🧰", "📞", "✉️", "👋", "🤝", "👥", "🎉", "⭐", "❓", "⚠️", "🛡️",
];

export const defaultBackground: Background = { type: "gradient", value: GRADIENTS[1].value };
