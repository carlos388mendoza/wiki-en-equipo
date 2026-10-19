# Backend de la wiki para Back4App Containers (plan gratis). Se construye desde la carpeta backend/
# (en Back4App: Root Directory = backend). Pasos y variables: README, sección "Despliegue".

# 1. Compilación: dependencias completas, cliente de Prisma y TypeScript.
FROM node:22-slim AS build
# Prisma necesita OpenSSL para detectar su motor.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run db:generate && pnpm run build && pnpm prune --prod

# 2. Imagen final: solo lo necesario para correr.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Las migraciones: al arrancar, el servidor aplica en Turso las que falten (models/migrate-turso.ts).
COPY --from=build /app/models/migrations ./models/migrations
COPY --from=build /app/models/schema.prisma ./models/schema.prisma

# Valores fijos de producción. Los secretos (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET,
# BOOTSTRAP_SECRET) se pegan en el panel del servicio, nunca aquí. Los archivos subidos van a la base
# (FILE_STORAGE=database); UPLOAD_DIR solo tiene que existir y poder escribirse.
ENV NODE_ENV=production \
    PORT=8080 \
    FILE_STORAGE=database \
    MAX_UPLOAD_BYTES=4194304 \
    TRUST_PROXY=2 \
    FRONTEND_ORIGIN=https://wiki-en-equipo.vercel.app \
    UPLOAD_DIR=/tmp/wiki-uploads

USER node
EXPOSE 8080
CMD ["node", "dist/api/server.js"]
