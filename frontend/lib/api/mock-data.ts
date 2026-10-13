import type { Department, Page, User } from "../types";

export const users: User[] = [
  { id: "u-ana", name: "Ana Rivera", email: "ana.rivera@grupocomidas.com", role: "admin", departmentId: "d-tec" },
  { id: "u-carlos", name: "Carlos Mejía", email: "carlos.mejia@grupocomidas.com", role: "admin_departamento", departmentId: "d-con" },
  { id: "u-luis", name: "Luis Paz", email: "luis.paz@grupocomidas.com", role: "usuario", departmentId: "d-tec" },
  { id: "u-maria", name: "María Zelaya", email: "maria.zelaya@grupocomidas.com", role: "usuario", departmentId: "d-com" },
];

export const departments: Department[] = [
  { id: "d-tec", slug: "tecnologia", name: "Tecnología", emoji: "💻", description: "Soporte, sistemas y equipos de todos los restaurantes.", featuredPageIds: ["p-equipo"] },
  { id: "d-con", slug: "contabilidad", name: "Contabilidad", emoji: "📊", description: "Cierres, conciliaciones y reportes financieros.", featuredPageIds: ["p-cierre"] },
  { id: "d-com", slug: "compras", name: "Compras", emoji: "🛒", description: "Proveedores, cotizaciones y abastecimiento.", featuredPageIds: ["p-proveedores"] },
];

const t = (text: string) => [{ text }];

export const pages: Page[] = [
  {
    id: "p-bienvenida", title: "Bienvenido a Grupo Comidas", emoji: "👋",
    background: { type: "gradiente", from: "#2E6A4F", to: "#E3A33A", angle: 120 },
    ownerId: "u-ana", departmentId: "d-tec", parentId: null, visibility: "empresa",
    tags: ["inducción", "general"], createdAt: "2026-08-01T14:00:00Z", updatedAt: "2026-10-02T15:20:00Z",
    deletedAt: null, views: 412, featuredInCompany: true, shares: [],
    blocks: [
      { id: "b1", type: "parrafo", content: [{ text: "Esta es la wiki interna del grupo. Aquí vive la documentación, los procesos y las guías de cada departamento." }] },
      { id: "b2", type: "aviso", emoji: "💡", content: [{ text: "Tus páginas nuevas son " }, { text: "privadas", bold: true }, { text: " hasta que decidas compartirlas o publicarlas." }] },
      { id: "b3", type: "titulo", level: 2, content: t("Primeros pasos") },
      { id: "b4", type: "lista", ordered: true, items: [
        t("Revisa el muro de tu departamento."),
        [{ text: "Lee la " }, { text: "política de viáticos", pageId: "p-viaticos" }, { text: "." }],
        [{ text: "Configura tu correo siguiendo la " }, { text: "guía oficial", href: "https://support.google.com/mail" }, { text: "." }],
      ] },
      { id: "b5", type: "imagen", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836", alt: "Mesa con platos de comida", width: 1600, height: 1067, caption: "Lo que hacemos todos los días." },
    ],
  },
  {
    id: "p-viaticos", title: "Política de viáticos", emoji: "🧾",
    background: { type: "patron", emoji: "🧾", color: "#FBF0DA" },
    ownerId: "u-ana", departmentId: "d-tec", parentId: null, visibility: "empresa",
    tags: ["políticas", "finanzas"], createdAt: "2026-07-10T14:00:00Z", updatedAt: "2026-09-12T10:00:00Z",
    deletedAt: null, views: 188, featuredInCompany: true, shares: [],
    blocks: [
      { id: "b1", type: "parrafo", content: t("Aplica a todo viaje de trabajo fuera de la ciudad base.") },
      { id: "b2", type: "tabla", header: ["Concepto", "Tope diario", "Requiere factura"], rows: [["Alimentación", "L 900", "Sí"], ["Hospedaje", "L 2,500", "Sí"], ["Transporte local", "L 600", "No"]] },
      { id: "b3", type: "cita", content: t("Los gastos se liquidan dentro de los 5 días hábiles después del viaje.") },
    ],
  },
  {
    id: "p-equipo", title: "Cómo pedir equipo de cómputo", emoji: "🖥️",
    background: { type: "color", value: "#E3EFE8" },
    ownerId: "u-luis", departmentId: "d-tec", parentId: null, visibility: "departamento",
    tags: ["procesos", "equipo"], createdAt: "2026-09-01T14:00:00Z", updatedAt: "2026-10-09T16:45:00Z",
    deletedAt: null, views: 57, featuredInCompany: false, shares: [],
    blocks: [
      { id: "b1", type: "titulo", level: 2, content: t("Antes de pedir") },
      { id: "b2", type: "lista", ordered: false, items: [t("Confirma el presupuesto con tu jefe."), t("Ten a mano el código del restaurante o área.")] },
      { id: "b3", type: "video", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", caption: "Recorrido por el formulario de solicitud." },
      { id: "b4", type: "subpagina", pageId: "p-equipo-faq" },
    ],
  },
  {
    id: "p-equipo-faq", title: "Preguntas frecuentes", emoji: "❓", background: null,
    ownerId: "u-luis", departmentId: "d-tec", parentId: "p-equipo", visibility: "departamento",
    tags: ["procesos"], createdAt: "2026-09-02T14:00:00Z", updatedAt: "2026-09-20T09:00:00Z",
    deletedAt: null, views: 21, featuredInCompany: false, shares: [],
    blocks: [{ id: "b1", type: "parrafo", content: t("¿Cuánto tarda la entrega? Entre 3 y 5 días hábiles.") }],
  },
  {
    id: "p-cierre", title: "Cierre contable mensual", emoji: "📅",
    background: { type: "imagen", url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f", credit: "Unsplash" },
    ownerId: "u-carlos", departmentId: "d-con", parentId: null, visibility: "departamento",
    tags: ["procesos", "finanzas"], createdAt: "2026-06-01T14:00:00Z", updatedAt: "2026-10-01T12:00:00Z",
    deletedAt: null, views: 96, featuredInCompany: false, shares: [],
    blocks: [
      { id: "b1", type: "parrafo", content: t("Calendario y responsables del cierre de cada mes.") },
      { id: "b2", type: "subpagina", pageId: "p-conciliaciones" },
    ],
  },
  {
    id: "p-conciliaciones", title: "Checklist de conciliaciones", emoji: "✅", background: null,
    ownerId: "u-carlos", departmentId: "d-con", parentId: "p-cierre", visibility: "departamento",
    tags: ["finanzas"], createdAt: "2026-06-02T14:00:00Z", updatedAt: "2026-09-29T12:00:00Z",
    deletedAt: null, views: 40, featuredInCompany: false, shares: [],
    blocks: [{ id: "b1", type: "lista", ordered: false, items: [t("Bancos"), t("Tarjetas de crédito"), t("Cuentas por pagar")] }],
  },
  {
    id: "p-proveedores", title: "Proveedores aprobados", emoji: "🥬",
    background: { type: "gradiente", from: "#E3EFE8", to: "#FFFFFF", angle: 180 },
    ownerId: "u-maria", departmentId: "d-com", parentId: null, visibility: "departamento",
    tags: ["proveedores"], createdAt: "2026-05-01T14:00:00Z", updatedAt: "2026-10-05T12:00:00Z",
    deletedAt: null, views: 73, featuredInCompany: false, shares: [],
    blocks: [
      { id: "b1", type: "tabla", header: ["Proveedor", "Categoría", "Contacto"], rows: [["Verduras del Valle", "Vegetales", "ventas@vdv.hn"], ["Lácteos Sula", "Lácteos", "pedidos@lsula.hn"]] },
    ],
  },
  {
    id: "p-vpn", title: "Borrador: guía de VPN", emoji: "🔐", background: null,
    ownerId: "u-luis", departmentId: "d-tec", parentId: null, visibility: "privada",
    tags: ["borrador"], createdAt: "2026-10-08T14:00:00Z", updatedAt: "2026-10-12T18:00:00Z",
    deletedAt: null, views: 0, featuredInCompany: false,
    shares: [{ userId: "u-maria", permission: "lectura" }],
    blocks: [{ id: "b1", type: "parrafo", content: t("Pasos para conectarse a la red desde fuera de la oficina.") }],
  },
  {
    id: "p-notas", title: "Mis notas", emoji: "📝", background: null,
    ownerId: "u-luis", departmentId: "d-tec", parentId: null, visibility: "privada",
    tags: [], createdAt: "2026-10-10T14:00:00Z", updatedAt: "2026-10-13T08:00:00Z",
    deletedAt: null, views: 0, featuredInCompany: false, shares: [],
    blocks: [{ id: "b1", type: "parrafo", content: t("Pendiente: revisar impresoras de la sucursal centro.") }],
  },
  {
    id: "p-viejo", title: "Inventario 2025 (viejo)", emoji: "📦", background: null,
    ownerId: "u-luis", departmentId: "d-tec", parentId: null, visibility: "privada",
    tags: [], createdAt: "2025-12-01T14:00:00Z", updatedAt: "2026-01-10T08:00:00Z",
    deletedAt: "2026-10-11T09:30:00Z", views: 0, featuredInCompany: false, shares: [],
    blocks: [],
  },
];
