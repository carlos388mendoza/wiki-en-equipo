/**
 * Plantillas por defecto de Grupo Comidas.
 *
 * Un administrador las instala desde /plantillas ("Instalar plantillas de Grupo Comidas"):
 * se crean con alcance COMPANY y `isDefault: true`. También las instala `npm run seed`.
 * Todas llevan foto de portada (Unsplash) e icono: de 3dicons (CC0, `3d:<nombre>`, archivos en assets/templates/3dicons)
 * o de Lucide sobre una tesela de color (`lucide:<nombre>:<tono>`). El instalador también pone la portada nueva a las
 * plantillas por defecto ya instaladas que no tenían foto (sin tocar su contenido).
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
const photoBg = (photo: string, icon: string): StoredAppearance => ({ type: "image", url: `https://images.unsplash.com/photo-${photo}`, icon });

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    title: "Documentación general",
    description: "Para documentar un sistema, una política o un tema: contexto, funcionamiento, responsables y preguntas frecuentes.",
    background: photoBg("1454165804606-c3d57bc86b40", "3d:documentacion"),
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
    background: photoBg("1528605248644-14dd04022da1", "3d:bienvenida"),
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
    background: photoBg("1522071820081-009f0129c71c", "3d:inicio-departamento"),
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
    background: photoBg("1531403009284-440f080d1e12", "3d:proceso"),
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
    background: photoBg("1556761175-5973dc0f32e7", "3d:acta"),
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
    background: photoBg("1556909114-f6e7ad7d3136", "3d:receta"),
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
    background: photoBg("1517248135467-4c7edcad34c4", "3d:apertura-cierre"),
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
    background: photoBg("1484480974693-6ca0a78fb36b", "3d:preguntas"),
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
  {
    title: "Manual de puesto",
    description: "Todo sobre un puesto: propósito, responsabilidades, horario, indicadores, herramientas y a quién reporta.",
    background: photoBg("1554224155-6726b3ff858f", "lucide:clipboard-list:cielo"),
    content: [
      table(["Puesto", "Departamento", "Reporta a", "Última revisión"], [["Nombre del puesto", "Área", "Puesto del jefe inmediato", "dd/mm/aaaa"]]),
      callout("🎯", "info", "Propósito del puesto", "En una o dos frases: para qué existe este puesto y cómo ayuda a que el restaurante o el área funcione bien."),
      h(2, "Responsabilidades principales"),
      ...list("bullet", ["Responsabilidad diaria más importante", "Responsabilidad semanal (reportes, inventarios, reuniones)", "Responsabilidad ante clientes o proveedores"]),
      h(2, "Horario y turnos"),
      table(["Turno", "Horario", "Días"], [["Mañana", "06:00 – 14:00", "Lunes a sábado"], ["Tarde", "14:00 – 22:00", "Según rol de turnos"]]),
      h(2, "Indicadores de desempeño"),
      table(["Indicador", "Meta", "Cómo se mide"], [["Tiempo de servicio", "Menos de 8 min por orden", "Sistema de punto de venta"], ["Satisfacción del cliente", "4.5 / 5", "Encuesta mensual"], ["Mermas", "Menos del 2 %", "Inventario semanal"]]),
      h(2, "Herramientas y accesos"),
      ...list("check", ["Usuario del punto de venta", "Correo de la empresa", "Acceso a la wiki y a la página de su departamento"]),
      h(2, "Competencias"),
      ...list("bullet", ["Atención al cliente", "Trabajo en equipo", "Manejo de efectivo y cierres de caja"]),
      callout("📚", "success", "Capacitación requerida", "Enlaza con @ el plan de capacitación y los procesos que esta persona debe dominar."),
    ],
  },
  {
    title: "Onboarding de empleado nuevo",
    description: "Plan de los primeros 30 días: antes del primer día, la primera semana, personas clave y verificación final.",
    background: photoBg("1521791136064-7986c2920216", "lucide:handshake:azafran"),
    content: [
      h(1, "¡Bienvenido a Grupo Comidas!"),
      p("Esta guía acompaña tus primeros 30 días. Tu jefe inmediato y tu compañero guía la revisan contigo cada semana."),
      table(["Nombre", "Puesto", "Sucursal o área", "Fecha de ingreso", "Compañero guía"], [["Nombre completo", "Puesto", "Sucursal", "dd/mm/aaaa", "Nombre"]]),
      h(2, "Antes del primer día (Recursos Humanos y Tecnología)"),
      ...list("check", ["Contrato firmado y expediente completo", "Uniforme y gafete listos", "Usuario de correo, wiki y punto de venta creados", "Equipo asignado (computadora o tableta, si aplica)"]),
      h(2, "Primer día"),
      ...list("check", ["Recorrido por la sucursal u oficina", "Presentación con el equipo", "Normas de seguridad e higiene", "Lectura de la política de viáticos y del reglamento interno"]),
      h(2, "Primera semana"),
      ...list("check", ["Acompañar a su compañero guía en cada turno", "Practicar los procesos clave de su puesto", "Revisar el manual de puesto con su jefe"]),
      h(2, "Días 8 a 30"),
      ...list("check", ["Trabajar con supervisión ligera", "Completar la capacitación obligatoria", "Reunión de retroalimentación al día 30"]),
      h(2, "Personas clave"),
      table(["Tema", "Persona", "Cómo contactar"], [["Dudas del puesto", "Jefe inmediato", "Extensión o celular"], ["Pagos y vacaciones", "Recursos Humanos", "Correo"], ["Problemas con el sistema", "Tecnología", "Solicitud de soporte en la wiki"]]),
      callout("✅", "success", "Al terminar", "El jefe inmediato marca este onboarding como completo y lo comenta con Recursos Humanos."),
    ],
  },
  {
    title: "Reporte de incidente",
    description: "Registro claro de un incidente en sucursal u oficina: qué pasó, impacto, acciones inmediatas y seguimiento.",
    background: photoBg("1555396273-367ea4eb4db5", "lucide:shield:tomate"),
    content: [
      callout("🚨", "danger", "Si hay personas en riesgo", "Primero atiende la emergencia y llama al 911. Llena este reporte después, el mismo día."),
      table(["Fecha y hora", "Sucursal o área", "Reportado por", "Tipo"], [["dd/mm/aaaa 00:00", "Sucursal", "Nombre y puesto", "Seguridad · Alimentos · Equipo · Cliente · Otro"]]),
      h(2, "Qué pasó"),
      p("Describe los hechos en orden: dónde, quiénes estaban y qué se observó. Sin opiniones ni culpables."),
      h(2, "Impacto"),
      table(["Aspecto", "Detalle"], [["Personas afectadas", "Clientes, colaboradores o ninguno"], ["Producto o equipo", "Qué se perdió o dañó"], ["Tiempo fuera de servicio", "Minutos u horas"], ["Costo estimado", "L 0.00"]]),
      h(2, "Acciones inmediatas"),
      ...list("check", ["Se aseguró el área", "Se avisó al gerente de turno", "Se tomaron fotos (agrégalas con /Imagen)", "Se avisó a Mantenimiento o Tecnología si aplica"]),
      h(2, "Causa"),
      p("¿Por qué ocurrió? Si no se sabe aún, escribe qué se va a investigar."),
      h(2, "Seguimiento"),
      ...list("check", ["Acción correctiva — Responsable — Fecha", "Acción para que no vuelva a pasar — Responsable — Fecha"]),
      callout("📎", "info", "Cierre", "El gerente revisa el reporte y lo comparte con su departamento cuando las acciones estén completas."),
    ],
  },
  {
    title: "Checklist de limpieza y seguridad alimentaria",
    description: "Revisión diaria de higiene, temperaturas, almacenamiento y limpieza para cada turno del restaurante.",
    background: photoBg("1466637574441-749b8f19452f", "lucide:clipboard-check:rojo"),
    content: [
      table(["Sucursal", "Fecha", "Turno", "Responsable"], [["Sucursal", "dd/mm/aaaa", "Mañana · Tarde · Noche", "Nombre"]]),
      callout("🧼", "warning", "Regla de oro", "Lavado de manos al entrar, al cambiar de tarea y después de tocar dinero, basura o producto crudo."),
      h(2, "Personal"),
      ...list("check", ["Uniforme limpio, gorro y cubrebocas", "Uñas cortas y sin joyas", "Nadie con síntomas de enfermedad trabaja con alimentos"]),
      h(2, "Temperaturas"),
      table(["Equipo", "Rango correcto", "Lectura", "Hora", "Iniciales"], [["Cámara de refrigeración", "1 °C a 4 °C", "", "", ""], ["Congelador", "-18 °C o menos", "", "", ""], ["Mantenedor caliente", "65 °C o más", "", "", ""]]),
      h(2, "Almacenamiento"),
      ...list("check", ["Primero en entrar, primero en salir (PEPS)", "Todo producto etiquetado con fecha de preparación y vencimiento", "Crudos debajo de cocidos en refrigeración", "Químicos lejos de los alimentos"]),
      h(2, "Limpieza"),
      ...list("check", ["Superficies de preparación desinfectadas", "Pisos y desagües limpios", "Baños revisados cada 2 horas", "Basura retirada y contenedores tapados"]),
      h(2, "Observaciones"),
      p("Anota cualquier desviación y la acción tomada. Si una temperatura está fuera de rango, avisa al gerente de inmediato."),
    ],
  },
  {
    title: "Evaluación de proveedor",
    description: "Calificación periódica de un proveedor: calidad, puntualidad, precio, servicio y decisión final.",
    background: photoBg("1490818387583-1baba5e638af", "lucide:truck:azafran"),
    content: [
      table(["Proveedor", "Categoría", "Periodo evaluado", "Evaluado por"], [["Nombre comercial", "Vegetales · Lácteos · Carnes · Empaques · Otro", "Mes o trimestre", "Nombre (Compras)"]]),
      h(2, "Calificación"),
      p("Califica de 1 (malo) a 5 (excelente) con base en los registros del periodo."),
      table(["Criterio", "Peso", "Calificación (1–5)", "Comentario"], [["Calidad del producto", "35 %", "", "Rechazos, frescura, cumplimiento de especificaciones"], ["Puntualidad en entregas", "25 %", "", "Entregas a tiempo / total"], ["Precio y condiciones", "20 %", "", "Comparado con otras cotizaciones"], ["Servicio y comunicación", "10 %", "", "Respuesta a reclamos"], ["Documentación y permisos", "10 %", "", "Facturas, registros sanitarios"]]),
      h(2, "Incidentes del periodo"),
      ...list("bullet", ["Fecha — qué pasó — cómo se resolvió"]),
      h(2, "Decisión"),
      ...list("check", ["Continuar sin cambios", "Continuar con plan de mejora", "Buscar proveedor alternativo"]),
      callout("🤝", "info", "Plan de mejora", "Acuerdos con el proveedor, responsable y fecha de la próxima revisión."),
    ],
  },
  {
    title: "Solicitud de soporte de Tecnología",
    description: "Pide ayuda a Tecnología con toda la información necesaria: equipo, problema, urgencia y pasos para reproducirlo.",
    background: photoBg("1486312338219-ce68d2c6f44d", "lucide:laptop:cielo"),
    content: [
      callout("⏱️", "info", "Antes de escribir", "Reinicia el equipo y revisa la conexión. Si el punto de venta no funciona y hay clientes esperando, llama directamente a Tecnología."),
      table(["Solicitante", "Sucursal o área", "Teléfono", "Fecha"], [["Nombre y puesto", "Sucursal", "Extensión o celular", "dd/mm/aaaa"]]),
      h(2, "Equipo o sistema"),
      ...list("check", ["Punto de venta", "Impresora de cocina o de facturas", "Computadora o tableta", "Internet o wifi", "Correo o usuario", "Otro"]),
      h(2, "Urgencia"),
      table(["Nivel", "Cuándo usarlo", "Tiempo de respuesta"], [["Crítica", "No se puede vender o atender", "1 hora"], ["Alta", "Funciona con fallas importantes", "4 horas"], ["Normal", "Molestia o mejora", "2 días hábiles"]]),
      h(2, "Qué pasa"),
      p("Describe el problema. Incluye el mensaje de error exacto y una foto de la pantalla (con /Imagen)."),
      h(2, "Pasos para que vuelva a pasar"),
      ...list("numbered", ["Qué estabas haciendo", "Qué botón o pantalla usaste", "Qué esperabas que pasara y qué pasó"]),
      h(2, "Seguimiento (lo llena Tecnología)"),
      table(["Fecha", "Acción", "Técnico", "Estado"], [["dd/mm/aaaa", "Diagnóstico", "Nombre", "Abierta · En proceso · Resuelta"]]),
    ],
  },
  {
    title: "Inventario semanal",
    description: "Conteo semanal de insumos por categoría con existencias, mínimos, pedidos y mermas.",
    background: photoBg("1553413077-190dd305871c", "lucide:package:carbon"),
    content: [
      table(["Sucursal", "Semana", "Contó", "Revisó"], [["Sucursal", "Del dd/mm al dd/mm", "Nombre", "Gerente"]]),
      callout("📋", "warning", "Cómo contar", "Cuenta a la misma hora cada semana, antes de recibir pedidos. Revisa fechas de vencimiento mientras cuentas."),
      h(2, "Proteínas"),
      table(["Producto", "Unidad", "Existencia", "Mínimo", "Pedir"], [["Pollo", "kg", "", "", ""], ["Carne de res", "kg", "", "", ""], ["Queso", "kg", "", "", ""]]),
      h(2, "Vegetales y frutas"),
      table(["Producto", "Unidad", "Existencia", "Mínimo", "Pedir"], [["Lechuga", "unidad", "", "", ""], ["Tomate", "kg", "", "", ""], ["Cebolla", "kg", "", "", ""]]),
      h(2, "Secos y bebidas"),
      table(["Producto", "Unidad", "Existencia", "Mínimo", "Pedir"], [["Harina", "saco", "", "", ""], ["Aceite", "galón", "", "", ""], ["Refrescos", "caja", "", "", ""]]),
      h(2, "Empaques y limpieza"),
      table(["Producto", "Unidad", "Existencia", "Mínimo", "Pedir"], [["Cajas para llevar", "paquete", "", "", ""], ["Servilletas", "paquete", "", "", ""], ["Desinfectante", "galón", "", "", ""]]),
      h(2, "Mermas de la semana"),
      table(["Producto", "Cantidad", "Motivo"], [["", "", "Vencido · Dañado · Error de preparación"]]),
      h(2, "Pedido"),
      ...list("check", ["Pedido enviado a Compras", "Pedido confirmado por el proveedor", "Diferencias anotadas al recibir"]),
    ],
  },
  {
    title: "Plan de capacitación",
    description: "Plan de formación de un equipo o puesto: objetivos, temas, calendario, evaluación y seguimiento.",
    background: photoBg("1542744173-8e7e53415bb0", "lucide:graduation-cap:uva"),
    content: [
      table(["Dirigido a", "Responsable", "Periodo", "Modalidad"], [["Puesto, equipo o sucursal", "Nombre", "Mes o trimestre", "Presencial · En línea · En el puesto"]]),
      callout("🎯", "success", "Objetivo", "Qué deben saber hacer las personas al terminar, en términos medibles (por ejemplo: preparar el menú completo sin ayuda)."),
      h(2, "Temas"),
      table(["Tema", "Duración", "Facilitador", "Material"], [["Servicio al cliente", "2 h", "Nombre", "Página de la wiki con @"], ["Seguridad alimentaria", "3 h", "Nombre", "Checklist de limpieza y seguridad alimentaria"], ["Uso del punto de venta", "1 h", "Tecnología", "Guía del sistema"]]),
      h(2, "Calendario"),
      table(["Fecha", "Tema", "Participantes", "Lugar"], [["dd/mm", "Tema 1", "Nombres", "Sucursal o sala"], ["dd/mm", "Tema 2", "Nombres", "En línea"]]),
      h(2, "Evaluación"),
      ...list("bullet", ["Prueba práctica en el puesto", "Cuestionario corto al final de cada tema", "Observación del supervisor durante dos semanas"]),
      h(2, "Seguimiento"),
      table(["Persona", "Temas completados", "Resultado", "Próximo paso"], [["Nombre", "0 / 3", "Pendiente", "Fecha"]]),
      callout("📈", "info", "Mejora continua", "Al terminar, anota qué funcionó y qué cambiar para la próxima capacitación."),
    ],
  },
];
