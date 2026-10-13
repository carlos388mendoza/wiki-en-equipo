/**
 * Plantillas por defecto de Grupo Comidas.
 *
 * Un administrador las instala desde /plantillas ("Instalar plantillas de Grupo Comidas"):
 * se crean con alcance COMPANY y `isDefault: true`. También las instala `npm run seed`.
 * Los iconos usan Lucide (`lucide:<nombre>:<tono>`, ver lib/icons.ts) y las imágenes, Unsplash.
 * Sin dependencias en tiempo de ejecución para que Node pueda importarlo directamente.
 */
import type { StoredAppearance, WikiBlock } from "./blocks";

export interface DefaultTemplate {
  title: string;
  description: string;
  background: StoredAppearance;
  content: WikiBlock[];
}

let n = 0;
const id = (prefix: string) => `${prefix}-${++n}`;
const h = (level: 1 | 2 | 3, text: string): WikiBlock => ({ id: id("h"), type: "heading", data: { level, text } });
const p = (text: string): WikiBlock => ({ id: id("p"), type: "paragraph", data: { text } });
const bold = (strong: string, rest: string): WikiBlock => ({ id: id("p"), type: "paragraph", data: { text: strong + rest, spans: [{ text: strong, bold: true }, { text: rest }] } });
const li = (style: "bullet" | "numbered" | "check", text: string): WikiBlock => ({ id: id("l"), type: "list", data: { style, text, ...(style === "check" && { checked: false }) } });
const list = (style: "bullet" | "numbered" | "check", items: string[]) => items.map((t) => li(style, t));
const callout = (emoji: string, tone: "info" | "success" | "warning" | "danger", title: string, text: string): WikiBlock => ({ id: id("c"), type: "callout", data: { emoji, tone, title, text } });
const table = (columns: string[], rows: string[][]): WikiBlock => ({ id: id("t"), type: "table", data: { columns, rows } });
const quote = (text: string): WikiBlock => ({ id: id("q"), type: "quote", data: { text } });
const divider = (): WikiBlock => ({ id: id("d"), type: "divider", data: {} });
const image = (photo: string, alt: string, caption: string): WikiBlock => ({ id: id("i"), type: "image", data: { url: `https://images.unsplash.com/photo-${photo}`, alt, caption } });
const photoBg = (photo: string, icon: string): StoredAppearance => ({ type: "image", url: `https://images.unsplash.com/photo-${photo}`, credit: "Unsplash", creditUrl: "https://unsplash.com/?utm_source=wiki_grupo_comidas&utm_medium=referral", icon });

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    title: "Documentación general",
    description: "Para documentar un sistema, una política o un tema: contexto, funcionamiento, responsables y preguntas frecuentes.",
    background: photoBg("1454165804606-c3d57bc86b40", "lucide:book-open:cielo"),
    content: [
      callout("🧭", "info", "En resumen", "Explica en dos o tres frases qué es, para quién es y qué problema resuelve. Quien lea solo esto debería entender lo esencial."),
      table(["Dato", "Detalle"], [["Responsable", "Nombre y puesto"], ["Área", "Departamento dueño del tema"], ["Última revisión", "dd/mm/aaaa"], ["Estado", "Vigente · En revisión · Obsoleto"]]),
      h(2, "Contexto"),
      p("¿Por qué existe esto? Cuenta brevemente la historia, la necesidad del negocio o la normativa que lo origina."),
      h(2, "Cómo funciona"),
      ...list("numbered", ["Describe el primer paso o componente.", "Explica cómo se conecta con el siguiente.", "Indica el resultado esperado."]),
      callout("💡", "warning", "Consejo", "Agrega capturas o un video con /Imagen o /Video embebido. Una imagen ahorra muchos párrafos."),
      h(2, "Responsables y contactos"),
      table(["Tema", "Persona", "Cómo contactar"], [["Dudas generales", "Nombre", "Correo o extensión"], ["Problemas urgentes", "Nombre", "Teléfono"]]),
      h(2, "Preguntas frecuentes"),
      bold("¿Pregunta común? ", "Respuesta corta y directa."),
      bold("¿Otra pregunta? ", "Enlaza otra página con @ si la respuesta es larga."),
      h(2, "Historial de cambios"),
      table(["Fecha", "Cambio", "Quién"], [["dd/mm/aaaa", "Versión inicial", "Nombre"]]),
    ],
  },
  {
    title: "Bienvenido al departamento",
    description: "Guía cálida para quien llega: quiénes somos, su primera semana, personas clave y herramientas.",
    background: photoBg("1528605248644-14dd04022da1", "lucide:handshake:albahaca"),
    content: [
      h(1, "¡Te damos la bienvenida al equipo!"),
      p("Nos alegra que estés aquí. Esta página reúne todo lo que necesitas para tus primeros días. Guárdala: la vas a consultar seguido."),
      quote("En Grupo Comidas cada plato cuenta, y cada persona del equipo también."),
      image("1522071820081-009f0129c71c", "Equipo trabajando junto", "Cambia esta foto por una de tu equipo."),
      h(2, "Quiénes somos"),
      p("Describe qué hace el departamento, a quién apoya y cómo se ve un buen día de trabajo."),
      h(2, "Tu primera semana"),
      ...list("check", ["Recoger tu equipo y credenciales", "Recorrido por las instalaciones y la cocina central", "Reunión de bienvenida con tu líder", "Leer los procesos principales del área", "Almuerzo con el equipo 🍽️"]),
      h(2, "Personas clave"),
      table(["Persona", "Rol", "Te ayuda con"], [["Nombre", "Líder del área", "Prioridades y dudas generales"], ["Nombre", "Tu compañero guía", "El día a día"], ["Nombre", "Recursos Humanos", "Planilla, vacaciones y beneficios"]]),
      h(2, "Herramientas y accesos"),
      table(["Herramienta", "Para qué sirve", "Cómo pedir acceso"], [["Correo", "Comunicación", "Lo entrega Tecnología"], ["Sistema de punto de venta", "Ventas", "Solicitud a Tecnología"], ["Esta wiki", "Documentación", "Ya lo tienes 😉"]]),
      callout("🔐", "danger", "Importante", "Nunca escribas contraseñas en la wiki ni las compartas por chat."),
      h(2, "Lecturas recomendadas"),
      p("Enlaza aquí con @ las páginas que toda persona nueva debe leer."),
    ],
  },
  {
    title: "Página de inicio de departamento",
    description: "Muro del departamento: misión, prioridades, accesos rápidos, anuncios y calendario.",
    background: { type: "gradient", value: "linear-gradient(120deg, #2e6a4f 0%, #e3a33a 100%)", icon: "lucide:building-2:albahaca" },
    content: [
      callout("🎯", "success", "Nuestra misión", "En una frase: para qué existe este departamento y cómo ayuda a Grupo Comidas."),
      h(2, "Prioridades del trimestre"),
      ...list("check", ["Prioridad 1 — responsable y fecha", "Prioridad 2 — responsable y fecha", "Prioridad 3 — responsable y fecha"]),
      h(2, "Accesos rápidos"),
      table(["Necesito…", "Ve a"], [["Pedir algo al área", "Enlace al formulario o página"], ["Conocer un proceso", "Mención a la página del proceso con @"], ["Hablar con alguien", "Canal o extensión"]]),
      h(2, "Anuncios"),
      callout("📣", "warning", "Novedad", "Escribe aquí el anuncio más importante. Mantén solo información vigente."),
      h(2, "Calendario del mes"),
      table(["Fecha", "Evento", "Quién participa"], [["dd/mm", "Reunión de equipo", "Todo el departamento"], ["dd/mm", "Cierre o entrega", "Responsables"]]),
      divider(),
      p("¿Algo desactualizado? Avisa al administrador del departamento."),
    ],
  },
  {
    title: "Proceso paso a paso",
    description: "Procedimiento operativo claro: objetivo, requisitos, pasos numerados, errores comunes e indicadores.",
    background: { type: "pattern", emoji: "🧾", color: "#fbf0da", icon: "lucide:list-checks:azafran" },
    content: [
      table(["Objetivo", "Alcance", "Frecuencia", "Responsable"], [["Qué se logra", "A quién aplica", "Diario · Semanal · Mensual", "Puesto"]]),
      h(2, "Antes de empezar"),
      ...list("check", ["Accesos necesarios", "Documentos o datos a la mano", "Aprobaciones previas"]),
      h(2, "Pasos"),
      ...list("numbered", ["Primer paso: qué hacer y dónde.", "Segundo paso: incluye el dato exacto a revisar.", "Tercer paso: cómo confirmar que quedó bien.", "Registrar el resultado y avisar a quien corresponda."]),
      callout("⚠️", "danger", "Errores comunes", "Describe los errores más frecuentes y cómo evitarlos."),
      h(2, "Si algo sale mal"),
      p("A quién llamar, qué información tener lista y cuánto tiempo esperar antes de escalar."),
      h(2, "Indicadores"),
      table(["Indicador", "Meta", "Cómo se mide"], [["Tiempo de ejecución", "< 30 min", "Registro del sistema"], ["Errores", "0 por semana", "Reporte del supervisor"]]),
    ],
  },
  {
    title: "Acta de reunión",
    description: "Agenda, acuerdos y tareas con responsable y fecha. Ideal para reuniones semanales.",
    background: { type: "color", value: "#eef6ff", icon: "lucide:calendar-days:cielo" },
    content: [
      table(["Fecha", "Hora", "Lugar", "Facilitador"], [["dd/mm/aaaa", "00:00", "Sala o enlace", "Nombre"]]),
      bold("Asistentes: ", "Nombre, Nombre, Nombre"),
      h(2, "Agenda"),
      ...list("numbered", ["Revisión de acuerdos anteriores", "Tema principal", "Varios"]),
      h(2, "Notas"),
      p("Ideas, datos y discusiones relevantes."),
      h(2, "Acuerdos"),
      ...list("bullet", ["Acuerdo 1", "Acuerdo 2"]),
      h(2, "Tareas"),
      ...list("check", ["Tarea — Responsable — Fecha límite", "Tarea — Responsable — Fecha límite"]),
      callout("📅", "info", "Próxima reunión", "Fecha, hora y temas pendientes."),
    ],
  },
  {
    title: "Receta estándar",
    description: "Ficha técnica de cocina: porciones, ingredientes, preparación, presentación, control de calidad y alérgenos.",
    background: photoBg("1556909114-f6e7ad7d3136", "lucide:chef-hat:tomate"),
    content: [
      table(["Porciones", "Tiempo total", "Costo por porción", "Marca o restaurante"], [["10", "45 min", "L 0.00", "Nombre"]]),
      image("1504674900247-0877df9cc836", "Plato terminado", "Foto de referencia del plato terminado."),
      h(2, "Ingredientes"),
      table(["Ingrediente", "Cantidad", "Unidad", "Notas"], [["Ingrediente 1", "1", "kg", "Fresco"], ["Ingrediente 2", "250", "g", ""]]),
      h(2, "Preparación"),
      ...list("numbered", ["Mise en place: lava, corta y pesa todo antes de empezar.", "Cocción: temperatura y tiempo exactos.", "Reposo y porcionado."]),
      h(2, "Presentación"),
      p("Describe el emplatado, la vajilla y la guarnición."),
      h(2, "Control de calidad"),
      ...list("check", ["Temperatura de servicio correcta", "Porción según la ficha", "Presentación igual a la foto"]),
      callout("🥜", "danger", "Alérgenos", "Lista los alérgenos presentes (gluten, lácteos, frutos secos, mariscos…)."),
    ],
  },
  {
    title: "Apertura y cierre de sucursal",
    description: "Listas de verificación para abrir y cerrar un restaurante sin olvidar nada.",
    background: photoBg("1517248135467-4c7edcad34c4", "lucide:store:albahaca"),
    content: [
      callout("⏰", "warning", "Horario", "Apertura: 00:00 · Cierre: 00:00. Ajusta según la sucursal."),
      h(2, "Apertura"),
      ...list("check", ["Desactivar alarma y revisar el local", "Encender equipos de cocina y verificar temperaturas", "Revisar inventario del día y recepción de proveedores", "Abrir caja con el fondo asignado", "Revisar limpieza de salón y baños"]),
      h(2, "Cierre"),
      ...list("check", ["Cerrar caja y hacer el corte", "Guardar y rotular alimentos", "Limpieza profunda de cocina", "Apagar equipos y gas", "Activar alarma"]),
      h(2, "Contactos de emergencia"),
      table(["Situación", "Contacto", "Teléfono"], [["Falla eléctrica", "Mantenimiento", "0000-0000"], ["Sistema de ventas", "Tecnología", "0000-0000"], ["Emergencia", "Gerente de turno", "0000-0000"]]),
    ],
  },
  {
    title: "Preguntas frecuentes",
    description: "Respuestas cortas a las dudas más comunes de un tema, agrupadas por categoría.",
    background: { type: "gradient", value: "linear-gradient(135deg, #e7f7f0 0%, #eef6ff 100%)", icon: "lucide:circle-help:uva" },
    content: [
      p("Si tu pregunta no está aquí, escríbele al responsable del tema."),
      h(2, "General"),
      bold("¿Pregunta? ", "Respuesta breve."),
      bold("¿Pregunta? ", "Respuesta breve."),
      h(2, "Trámites"),
      bold("¿Pregunta? ", "Respuesta breve con enlace a la página del proceso (usa @)."),
      callout("💬", "info", "¿Falta algo?", "Propón nuevas preguntas al responsable de esta página."),
    ],
  },
];
