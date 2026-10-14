import "dotenv/config";
import { createServer } from "node:http";
import { app, attachWebSockets } from "./app.js";
import { prisma } from "../models/client.js";
import { backfillSearchText } from "../services/search-text.js";

const port = Number(process.env.PORT ?? 4000);
const server = createServer(app);
attachWebSockets(server);

server.listen(port, () => console.log(`Wiki en equipo API escuchando en http://localhost:${port}`));

// Páginas creadas antes de la búsqueda en el contenido: se indexan una sola vez al arrancar.
backfillSearchText().then((count) => { if (count) console.log(`Búsqueda: ${count} páginas indexadas.`); }).catch((error) => console.error("No se pudo indexar la búsqueda:", error));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
