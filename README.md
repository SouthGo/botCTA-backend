# Albion CTA System – Backend

API para gestionar las CTA del gremio Albion. Construida con Node.js + Express, Supabase y un bot de Discord integrado.

## Requisitos

- Node.js 20+
- Dependencias instaladas (`npm install`)
- Variables de entorno definidas (ver `.env.example`)
- Instancia Supabase con el esquema de `supabase/schema.sql`

## Scripts

- `npm run dev` – inicia el servidor con nodemon
- `npm run start` – arranca en modo producción
- `npm run lint` – ejecuta ESLint

## Estructura

- `src/api` – rutas HTTP para CTAs, postulantes y roles
- `src/db` – cliente y helpers de Supabase
- `src/bot` – bot Discord (comandos y eventos)
- `src/jobs` – cron job para recordatorios
- `src/server.js` – bootstrap del servidor

## Despliegue

Pensado para Railway. Configura las variables de entorno y asegúrate de que el bot de Discord tenga sus credenciales (`DISCORD_*`).

