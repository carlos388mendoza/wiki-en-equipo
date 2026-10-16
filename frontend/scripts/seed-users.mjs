/**
 * Usuarios de los datos de prueba (`npm run seed`). Los usan el seed y las pruebas de integración.
 * La contraseña es fija por decisión del equipo; cámbiala en producción después del primer acceso.
 */
export const SEED_PASSWORD = "12345abc";

export const SEED_USERS = {
  admin: { name: "Administrador", email: "adminwiki@grupocomidas.com", role: "ADMIN", department: "Tecnología" },
  contabilidad: { name: "Admin Contabilidad", email: "contabilidadwiki@grupocomidas.com", role: "DEPARTMENT_ADMIN", department: "Contabilidad" },
  tecnologia: { name: "Usuario Tecnología", email: "tecnologiawiki@grupocomidas.com", role: "USER", department: "Tecnología" },
  compras: { name: "Usuario Compras", email: "compraswiki@grupocomidas.com", role: "USER", department: "Compras" },
};
