#!/usr/bin/env node
/**
 * Datos de prueba para desarrollo local. Uso: `npm run seed` (con el backend en marcha
 * y la base de datos recién migrada).
 *
 * - Crea el primer administrador con POST /api/auth/bootstrap (lee BOOTSTRAP_SECRET de backend/.env).
 * - Crea departamentos, usuarios, páginas, compartidos, muros y destacadas.
 * - Las contraseñas (y tokens de 8 h, para no agotar el límite de inicios de sesión del backend)
 *   se generan al azar y se guardan en `.dev-users.local.json` (ignorado por git).
 *   Nunca uses estos usuarios fuera de tu máquina.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const API = `${(process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "")}/api`;
const OUT = join(here, "..", ".dev-users.local.json");

function readBootstrapSecret() {
  if (process.env.BOOTSTRAP_SECRET) return process.env.BOOTSTRAP_SECRET;
  try {
    const env = readFileSync(join(here, "..", "..", "backend", ".env"), "utf8");
    const line = env.split(/\r?\n/).find((l) => l.startsWith("BOOTSTRAP_SECRET="));
    return line?.slice("BOOTSTRAP_SECRET=".length).trim().replace(/^"|"$/g, "");
  } catch {
    return undefined;
  }
}

async function call(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { ...(body && { "Content-Type": "application/json" }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const password = () => randomBytes(12).toString("base64url");
let n = 0;
const id = () => `seed-${++n}`;
const p = (text, extra = {}) => ({ id: id(), type: "paragraph", data: { text, ...extra } });
const h = (level, text) => ({ id: id(), type: "heading", data: { level, text } });
const li = (style, text, extra = {}) => ({ id: id(), type: "list", data: { style, text, ...extra } });
const rich = (spans) => ({ id: id(), type: "paragraph", data: { text: spans.map((s) => s.text).join(""), spans } });

async function main() {
  const secret = readBootstrapSecret();
  if (!secret) throw new Error("No encontré BOOTSTRAP_SECRET (en backend/.env o en la variable de entorno).");

  const users = {
    ana: { name: "Ana Rivera", email: "ana.rivera@wiki.test", password: password(), role: "ADMIN", department: "Tecnología" },
    carlos: { name: "Carlos Mejía", email: "carlos.mejia@wiki.test", password: password(), role: "DEPARTMENT_ADMIN", department: "Contabilidad" },
    luis: { name: "Luis Paz", email: "luis.paz@wiki.test", password: password(), role: "USER", department: "Tecnología" },
    maria: { name: "María Zelaya", email: "maria.zelaya@wiki.test", password: password(), role: "USER", department: "Compras" },
  };

  console.log("Creando administrador inicial…");
  const boot = await call("/auth/bootstrap", {
    method: "POST",
    body: { name: users.ana.name, email: users.ana.email, password: users.ana.password, departmentName: users.ana.department, secret },
  }).catch((e) => {
    if (String(e.message).includes("409")) throw new Error("La base de datos ya tiene usuarios. Borra backend/models/dev.db, vuelve a aplicar la migración y repite.");
    throw e;
  });
  const admin = boot.token;
  const deps = { Tecnología: boot.user.departmentId };
  const departments = {
    Tecnología: { description: "Sistemas, equipos y soporte para oficinas y restaurantes.", icon: "lucide:laptop:cielo" },
    Contabilidad: { description: "Pagos a proveedores, facturación y cierres contables del grupo.", icon: "lucide:chart-column:albahaca" },
    Compras: { description: "Proveedores, insumos y abastecimiento de las marcas.", icon: "lucide:shopping-cart:azafran" },
  };
  for (const name of ["Contabilidad", "Compras"]) deps[name] = (await call("/departments", { method: "POST", token: admin, body: { name, ...departments[name] } })).department.id;
  await call(`/departments/${deps.Tecnología}`, { method: "PATCH", token: admin, body: departments.Tecnología });

  const tokens = { ana: admin };
  for (const key of ["carlos", "luis", "maria"]) {
    const u = users[key];
    await call("/users", { method: "POST", token: admin, body: { name: u.name, email: u.email, password: u.password, role: u.role, departmentId: deps[u.department] } });
    tokens[key] = (await call("/auth/login", { method: "POST", body: { email: u.email, password: u.password } })).token;
  }
  const ids = {};
  for (const key of Object.keys(users)) ids[key] = (await call("/auth/me", { token: tokens[key] })).user.id;

  console.log("Instalando plantillas de Grupo Comidas…");
  const { DEFAULT_TEMPLATES } = await import("../lib/default-templates.ts");
  // Las plantillas básicas que crea el backend se conservan, pero dejan de ser "por defecto".
  for (const t of (await call("/templates", { token: admin })).templates) {
    if (t.isDefault) await call(`/templates/${t.id}`, { method: "PATCH", token: admin, body: { isDefault: false } });
  }
  for (const t of DEFAULT_TEMPLATES) {
    // El icono va en su propio campo; las plantillas por defecto lo traen dentro del fondo.
    const { icon, ...background } = t.background;
    const created = await call("/templates", { method: "POST", token: admin, body: { title: t.title, description: t.description, scope: "COMPANY", content: t.content, background, icon } });
    await call(`/templates/${created.template.id}`, { method: "PATCH", token: admin, body: { isDefault: true } });
  }

  // Las páginas de ejemplo escriben el icono junto al fondo; se envía en su propio campo.
  const page = async (who, { background, ...body }) => {
    const { icon, ...rest } = background ?? {};
    return (await call("/pages", { method: "POST", token: tokens[who], body: { ...body, icon: icon ?? null, background: rest } })).page;
  };

  console.log("Creando páginas…");
  const viaticos = await page("ana", {
    title: "Política de viáticos", visibility: "COMPANY", tags: ["políticas", "finanzas"],
    background: { type: "pattern", emoji: "🧾", color: "#fbf0da", icon: "🧾" },
    content: [
      p("Aplica a todo viaje de trabajo fuera de la ciudad base."),
      { id: id(), type: "table", data: { columns: ["Concepto", "Tope diario", "Requiere factura"], rows: [["Alimentación", "L 900", "Sí"], ["Hospedaje", "L 2,500", "Sí"], ["Transporte local", "L 600", "No"]] } },
      { id: id(), type: "quote", data: { text: "Los gastos se liquidan dentro de los 5 días hábiles después del viaje." } },
    ],
  });
  const bienvenida = await page("ana", {
    title: "Bienvenido a Grupo Comidas", visibility: "COMPANY", tags: ["inducción", "general"],
    background: { type: "gradient", value: "linear-gradient(120deg, #2e6a4f 0%, #e3a33a 100%)", icon: "marca:grupo-comidas" },
    content: [
      p("Esta es la wiki interna del grupo. Aquí vive la documentación, los procesos y las guías de cada departamento."),
      { id: id(), type: "callout", data: { emoji: "💡", tone: "warning", text: "Tus páginas nuevas son privadas hasta que decidas compartirlas o publicarlas.", spans: [{ text: "Tus páginas nuevas son " }, { text: "privadas", bold: true }, { text: " hasta que decidas compartirlas o publicarlas." }] } },
      h(2, "Primeros pasos"),
      li("numbered", "Revisa el muro de tu departamento."),
      { id: id(), type: "list", data: { style: "numbered", text: "Lee la política de viáticos.", spans: [{ text: "Lee la " }, { text: "política de viáticos", pageId: viaticos.id }, { text: "." }] } },
      { id: id(), type: "list", data: { style: "numbered", text: "Configura tu correo siguiendo la guía oficial.", spans: [{ text: "Configura tu correo siguiendo la " }, { text: "guía oficial", href: "https://support.google.com/mail" }, { text: "." }] } },
      { id: id(), type: "image", data: { url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836", alt: "Mesa con platos de comida", caption: "Lo que hacemos todos los días.", width: 1600, height: 1067 } },
    ],
  });
  const muroEmpresa = await page("ana", {
    title: "Lo que todo el grupo necesita saber", visibility: "COMPANY", tags: ["muro"],
    background: { type: "gradient", value: "linear-gradient(135deg, #e3efe8 0%, #fbf0da 100%)", icon: "marca:grupo-comidas" },
    content: [
      h(2, "Anuncios"),
      { id: id(), type: "callout", data: { emoji: "📣", tone: "info", title: "Nueva wiki", text: "Desde este mes, toda la documentación del grupo vive aquí. Pide acceso a tu administrador si te falta algo." } },
      h(2, "Para empezar"),
      { id: id(), type: "subpage", data: { pageId: bienvenida.id } },
      { id: id(), type: "subpage", data: { pageId: viaticos.id } },
    ],
  });
  await call("/company/wall", { method: "PUT", token: admin, body: { pageId: muroEmpresa.id } });
  await call("/company/featured", { method: "PUT", token: admin, body: { pageIds: [bienvenida.id, viaticos.id] } });

  const equipo = await page("luis", {
    title: "Cómo pedir equipo de cómputo", visibility: "DEPARTMENT", tags: ["procesos", "equipo"],
    background: { type: "color", value: "#e3efe8", icon: "🖥️" },
    content: [h(2, "Antes de pedir"), li("bullet", "Confirma el presupuesto con tu jefe."), li("bullet", "Ten a mano el código del restaurante o área.")],
  });
  const faq = await page("luis", {
    title: "Preguntas frecuentes", visibility: "DEPARTMENT", parentId: equipo.id, tags: ["procesos"],
    background: { type: "none", icon: "❓" },
    content: [p("¿Cuánto tarda la entrega? Entre 3 y 5 días hábiles.")],
  });
  await call(`/pages/${equipo.id}`, { method: "PATCH", token: tokens.luis, body: { expectedVersion: equipo.version, content: [h(2, "Antes de pedir"), li("bullet", "Confirma el presupuesto con tu jefe."), li("bullet", "Ten a mano el código del restaurante o área."), { id: id(), type: "subpage", data: { pageId: faq.id } }] } });

  const vpn = await page("luis", {
    title: "Borrador: guía de VPN", tags: ["borrador"], background: { type: "none", icon: "🔐" },
    content: [p("Pasos para conectarse a la red desde fuera de la oficina.")],
  });
  await call(`/pages/${vpn.id}/shares/${ids.maria}`, { method: "PUT", token: tokens.luis, body: { permission: "READ" } });

  const soporte = await page("luis", {
    title: "Checklist de soporte en sucursales", tags: ["procesos"], background: { type: "none", icon: "🧰" },
    content: [li("check", "Revisar impresoras", { checked: true }), li("check", "Probar la conexión del punto de venta")],
  });
  await call(`/pages/${soporte.id}/shares/${ids.maria}`, { method: "PUT", token: tokens.luis, body: { permission: "EDIT" } });

  await page("luis", { title: "Mis notas", tags: [], background: { type: "none", icon: "📝" }, content: [p("Pendiente: revisar impresoras de la sucursal centro.")] });
  const viejo = await page("luis", { title: "Inventario 2025 (viejo)", background: { type: "none", icon: "📦" }, content: [] });
  await call(`/pages/${viejo.id}`, { method: "DELETE", token: tokens.luis });

  const cierre = await page("carlos", {
    title: "Cierre contable mensual", visibility: "DEPARTMENT", tags: ["procesos", "finanzas"],
    background: { type: "image", url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f", credit: "Unsplash", icon: "📅" },
    content: [p("Calendario y responsables del cierre de cada mes.")],
  });
  await page("carlos", {
    title: "Checklist de conciliaciones", visibility: "DEPARTMENT", parentId: cierre.id, tags: ["finanzas"],
    background: { type: "none", icon: "✅" },
    content: [li("check", "Bancos"), li("check", "Tarjetas de crédito"), li("check", "Cuentas por pagar")],
  });
  const muroConta = await page("carlos", {
    title: "Inicio de Contabilidad", visibility: "DEPARTMENT",
    background: { type: "gradient", value: "linear-gradient(135deg, #fff4df 0%, #fff0ed 100%)", icon: "📊" },
    content: [
      { id: id(), type: "callout", data: { emoji: "🎯", tone: "success", title: "Nuestra misión", text: "Cierres puntuales y reportes claros para que todo el grupo tome buenas decisiones." } },
      h(2, "Esta semana"), li("bullet", "Cierre de septiembre: viernes 17"), li("bullet", "Conciliaciones bancarias pendientes: 3"),
    ],
  });
  await call(`/departments/${deps.Contabilidad}/wall`, { method: "PUT", token: tokens.carlos, body: { pageId: muroConta.id } });
  await call(`/departments/${deps.Contabilidad}/featured`, { method: "PUT", token: tokens.carlos, body: { pageIds: [cierre.id] } });
  await call(`/departments/${deps.Tecnología}/featured`, { method: "PUT", token: admin, body: { pageIds: [equipo.id] } });

  await page("maria", {
    title: "Proveedores aprobados", visibility: "DEPARTMENT", tags: ["proveedores"],
    background: { type: "gradient", value: "linear-gradient(180deg, #e3efe8 0%, #ffffff 100%)", icon: "🥬" },
    content: [{ id: id(), type: "table", data: { columns: ["Proveedor", "Categoría", "Contacto"], rows: [["Verduras del Valle", "Vegetales", "ventas@vdv.test"], ["Lácteos Sula", "Lácteos", "pedidos@lsula.test"]] } }],
  });

  console.log("Compartiendo una plantilla…");
  const visita = (await call("/templates", { method: "POST", token: tokens.luis, body: {
    title: "Visita técnica a sucursal", description: "Lo que hay que revisar al visitar un restaurante.", scope: "PRIVATE", icon: "lucide:wrench:cielo",
    background: { type: "color", value: "#eef6ff" },
    content: [h(2, "Antes de salir"), li("check", "Confirmar la visita con el gerente"), h(2, "En la sucursal"), li("check", "Punto de venta"), li("check", "Impresoras de cocina"), li("check", "Red y wifi")],
  } })).template;
  await call(`/templates/${visita.id}/shares/${ids.maria}`, { method: "PUT", token: tokens.luis, body: { permission: "READ" } });
  await call(`/templates/${visita.id}/shares/${ids.carlos}`, { method: "PUT", token: tokens.luis, body: { permission: "EDIT" } });

  // Algunas visitas para "Más visitadas" (el backend cuenta una por persona cada 30 minutos).
  for (const [who, pg] of [["luis", bienvenida], ["maria", bienvenida], ["carlos", bienvenida], ["maria", viaticos], ["carlos", viaticos], ["ana", equipo], ["luis", equipo]]) {
    await call(`/pages/${pg.id}/visit`, { method: "POST", token: tokens[who] });
  }

  const summary = Object.fromEntries(Object.entries(users).map(([k, u]) => [k, { name: u.name, email: u.email, password: u.password, role: u.role, department: u.department, id: ids[k], token: tokens[k] }]));
  writeFileSync(OUT, JSON.stringify({ createdAt: new Date().toISOString(), backend: API, users: summary, pages: { vpn: vpn.id, soporte: soporte.id, equipo: equipo.id, bienvenida: bienvenida.id }, templates: { visita: visita.id } }, null, 2));
  console.log(`Listo. Usuarios y contraseñas en ${OUT} (no lo subas al repositorio).`);
}

main().catch((error) => {
  console.error(`No se pudieron crear los datos de prueba: ${error.message}`);
  process.exit(1);
});
